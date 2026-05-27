"""
LegacyLift — FastAPI Application
Main entry point for the backend API server.
"""

from __future__ import annotations

import io
import json
import zipfile
import os
import openai
from typing import List, Dict
from pydantic import BaseModel

from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agent.orchestrator import run_pipeline
from agent.validator import run_tests
from database import init_db, get_db
from auth import (
    SignupRequest, LoginRequest, TokenResponse, UserInfo,
    signup, login, get_current_user,
)

load_dotenv()

app = FastAPI(
    title="LegacyLift",
    description="Legacy code modernization tool",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_SOURCE_LANGS = {"php", "cobol", "vb6", "perl", "fortran", "pascal", "java"}
VALID_TARGET_LANGS = {"python", "typescript", "go", "java"}
MAX_FILE_SIZE = 1_073_741_824  # 1 GB


@app.on_event("startup")
async def on_startup():
    await init_db()


# ── Auth ──────────────────────────────────────────────────────

@app.post("/api/auth/signup", response_model=TokenResponse)
async def api_signup(req: SignupRequest):
    return await signup(req)


@app.post("/api/auth/login", response_model=TokenResponse)
async def api_login(req: LoginRequest):
    return await login(req)


@app.get("/api/auth/me")
async def api_me(user: UserInfo = Depends(get_current_user)):
    return user.model_dump()


# ── Health ────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}


# ── Modernize (single file) ──────────────────────────────────

@app.post("/api/modernize")
async def modernize(
    file: UploadFile,
    source_lang: str = Form(...),
    target_lang: str = Form(...),
):
    if source_lang.lower() not in VALID_SOURCE_LANGS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid source language: {source_lang}. Must be one of: {', '.join(VALID_SOURCE_LANGS)}",
        )
    if target_lang.lower() not in VALID_TARGET_LANGS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid target language: {target_lang}. Must be one of: {', '.join(VALID_TARGET_LANGS)}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large.")

    try:
        source_code = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text.")

    return StreamingResponse(
        generate_sse(source_code, source_lang.lower(), target_lang.lower()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# ── Multi-file / Zip upload ──────────────────────────────────

@app.post("/api/modernize/multi")
async def modernize_multi(
    file: UploadFile,
    source_lang: str = Form(...),
    target_lang: str = Form(...),
):
    """Accept a .zip file and modernize all source files inside it."""
    content = await file.read()

    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a .zip file.")

    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid zip file.")

    LANG_EXTENSIONS = {
        "php": (".php",),
        "cobol": (".cob", ".cbl", ".cobol"),
        "vb6": (".bas", ".vb", ".cls", ".frm"),
        "perl": (".pl", ".pm"),
        "fortran": (".f", ".f90", ".f95", ".for"),
        "pascal": (".pas", ".pp"),
        "java": (".java",),
    }

    extensions = LANG_EXTENSIONS.get(source_lang.lower(), ())
    source_files = {}
    for name in zf.namelist():
        if name.endswith("/"):
            continue
        if any(name.lower().endswith(ext) for ext in extensions):
            try:
                source_files[name] = zf.read(name).decode("utf-8")
            except UnicodeDecodeError:
                continue

    if not source_files:
        raise HTTPException(status_code=400, detail=f"No {source_lang} files found in the zip.")

    return StreamingResponse(
        generate_multi_sse(source_files, source_lang.lower(), target_lang.lower()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# ── Re-run tests (human-in-the-loop) ─────────────────────────

@app.post("/api/retest")
async def retest(
    modernized_code: str = Form(...),
    test_code: str = Form(...),
    target_lang: str = Form(...),
):
    """Re-run tests after user edits the modernized code."""
    results = run_tests(modernized_code, test_code, target_lang)
    return {"test_results": [r.model_dump() for r in results]}


# ── AI Code Chat ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    original_code: str
    modernized_code: str
    source_lang: str
    target_lang: str
    messages: List[Dict[str, str]]

from agent.llm import call_llm_with_rotation

@app.post("/api/chat")
async def chat(req: ChatRequest):
    """Conversational code modernization assistance."""
    system_prompt = (
        f"You are a Senior Migration Engineer. The user is modernizing a legacy code file from {req.source_lang} to {req.target_lang}.\n"
        f"Here is the original {req.source_lang} code:\n"
        f"```\n{req.original_code}\n```\n\n"
        f"Here is the modernized {req.target_lang} code:\n"
        f"```\n{req.modernized_code}\n```\n\n"
        f"Answer the user's questions strictly in context of the original and modernized code blocks. "
        f"Help explain transformations, explain logic details, or suggest refactored modernized improvements."
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.messages:
        messages.append({"role": msg["role"], "content": msg["content"]})

    try:
        reply = await call_llm_with_rotation(
            temperature=0.2,
            max_tokens=2000,
            messages=messages,
        )
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Session History ───────────────────────────────────────────

@app.get("/api/history")
async def get_history(user: UserInfo = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, filename, source_lang, target_lang, confidence_score, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user.id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
    finally:
        await db.close()


@app.get("/api/history/{session_id}")
async def get_session(session_id: int, user: UserInfo = Depends(get_current_user)):
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM sessions WHERE id = ? AND user_id = ?",
            (session_id, user.id),
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        data = dict(row)
        if data.get("test_results"):
            data["test_results"] = json.loads(data["test_results"])
        if data.get("complexity_score"):
            data["complexity_score"] = json.loads(data["complexity_score"])
        return data
    finally:
        await db.close()


@app.post("/api/history")
async def save_session(
    filename: str = Form(""),
    source_lang: str = Form(...),
    target_lang: str = Form(...),
    original_code: str = Form(...),
    modernized_code: str = Form(""),
    documentation: str = Form(""),
    unit_tests: str = Form(""),
    test_results: str = Form("[]"),
    confidence_score: float = Form(0.0),
    change_summary: str = Form(""),
    complexity_score: str = Form("{}"),
    architecture_diagram: str = Form(""),
    user: UserInfo = Depends(get_current_user),
):
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO sessions
               (user_id, filename, source_lang, target_lang, original_code, modernized_code,
                documentation, unit_tests, test_results, confidence_score, change_summary,
                complexity_score, architecture_diagram)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user.id, filename, source_lang, target_lang, original_code, modernized_code,
             documentation, unit_tests, test_results, confidence_score, change_summary,
             complexity_score, architecture_diagram),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "status": "saved"}
    finally:
        await db.close()


# ── SSE Generators ────────────────────────────────────────────

async def generate_sse(source_code: str, source_lang: str, target_lang: str):
    async for event in run_pipeline(source_code, source_lang, target_lang):
        yield f"data: {json.dumps(event.model_dump())}\n\n"


async def generate_multi_sse(files: dict[str, str], source_lang: str, target_lang: str):
    total = len(files)
    for idx, (filename, source_code) in enumerate(files.items()):
        yield f"data: {json.dumps({'step': 'multi_progress', 'data': {'file': filename, 'index': idx, 'total': total}})}\n\n"
        async for event in run_pipeline(source_code, source_lang, target_lang):
            event_data = event.model_dump()
            event_data["data"]["_file"] = filename
            event_data["data"]["_index"] = idx
            event_data["data"]["_total"] = total
            yield f"data: {json.dumps(event_data)}\n\n"


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
