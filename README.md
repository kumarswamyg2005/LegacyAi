# LegacyLift

Legacy code modernization tool. Upload PHP, COBOL, VB6, Perl, Fortran, Pascal, or Java code and get it rewritten into modern Python, TypeScript, Go, or Java — with full documentation, unit tests, confidence scoring, complexity analysis, architecture diagrams, and PDF reports.

## Features

- **Multi-language support** — 7 source languages → 4 target languages
- **Multi-file migration** — Upload a .zip to modernize an entire project
- **Live execution sandbox** — Run modernized Python code in the browser via Pyodide
- **Human-in-the-loop editing** — Edit code in the sandbox, re-run tests to validate
- **PDF export** — Generate a professional migration report
- **Version history** — Save and revisit past conversions (requires signup)
- **Architecture diagrams** — Auto-generated Mermaid diagrams of code structure
- **Cost/complexity estimation** — LOC, cyclomatic complexity, nesting depth, effort estimates
- **Auth & usage tiers** — JWT signup/login, Free (5/day), Pro (100/day), Enterprise
- **Confidence scoring** — LLM evaluates functional equivalence (0.0–1.0)

## Architecture

- **Backend**: Python FastAPI + SQLite + JWT auth + OpenAI/ChatGPT
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Monaco Editor + Mermaid + Pyodide

## Quick Start

### 1. Backend

```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
python main.py
# Server runs on http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

## Pipeline

1. **Parsing** — AST extraction via tree-sitter (PHP) or regex (other languages)
2. **Documenting** — LLM generates markdown documentation
3. **Rewriting** — LLM rewrites code into the target language
4. **Test Generation** — LLM generates unit tests
5. **Validation** — Tests run in an isolated temp directory
6. **Complexity Analysis** — Code metrics, nesting, cyclomatic complexity, effort
7. **Architecture Diagram** — Mermaid diagram via LLM
8. **Change Summary** — Human-readable summary of all changes

## API Endpoints

| Endpoint               | Method | Description                        |
| ---------------------- | ------ | ---------------------------------- |
| `/api/health`          | GET    | Health check                       |
| `/api/auth/signup`     | POST   | Create account                     |
| `/api/auth/login`      | POST   | Login, returns JWT                 |
| `/api/auth/me`         | GET    | Current user info                  |
| `/api/modernize`       | POST   | Single file modernization (SSE)    |
| `/api/modernize/multi` | POST   | Zip multi-file modernization (SSE) |
| `/api/retest`          | POST   | Re-run tests after edits           |
| `/api/history`         | GET    | List past sessions                 |
| `/api/history/:id`     | GET    | Full session details               |
| `/api/history`         | POST   | Save a session                     |

## Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS          |
| UI       | Monaco Editor, Framer Motion, Mermaid, jsPDF      |
| Sandbox  | Pyodide (WebAssembly Python)                      |
| Backend  | Python FastAPI, Pydantic v2, SQLite               |
| Auth     | JWT (python-jose), bcrypt                         |
| AI       | OpenAI/ChatGPT                                    |
| Parsing  | tree-sitter (PHP), regex (COBOL, VB6, Perl, etc.) |
| Testing  | pytest (Python), Jest (TypeScript)                |

## Environment Variables

| Variable               | Description                         |
| ---------------------- | ----------------------------------- |
| `OPENAI_API_KEY`       | OpenAI API key                      |
| `OPENAI_MODEL`         | OpenAI model name (default: gpt-4o-mini) |
| `JWT_SECRET`           | Secret for JWT signing              |
| `STRIPE_SECRET_KEY`    | Stripe key (optional, for payments) |
| `MAX_FILE_SIZE_KB`     | Max upload size (default 1GB)       |
| `TEST_TIMEOUT_SECONDS` | Test runner timeout (default 15)    |

## Usage Tiers

| Tier       | Conversions/Day | Price    |
| ---------- | --------------- | -------- |
| Free       | 5               | $0       |
| Pro        | 100             | $9.99/mo |
| Enterprise | 10,000          | Custom   |
