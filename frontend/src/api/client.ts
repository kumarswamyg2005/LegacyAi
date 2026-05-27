import type { SSEEvent } from "../types";

export async function* modernizeCode(
  input: File | string,
  sourceLang: string,
  targetLang: string
): AsyncGenerator<SSEEvent> {
  try {
    const formData = new FormData();

    if (typeof input === "string") {
      const blob = new Blob([input], { type: "text/plain" });
      formData.append("file", blob, "input.txt");
    } else {
      formData.append("file", input);
    }

    formData.append("source_lang", sourceLang);
    formData.append("target_lang", targetLang);

    const isZip = typeof input !== "string" && input.name.endsWith(".zip");
    const endpoint = isZip ? "/api/modernize/multi" : "/api/modernize";

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Server error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");

      // Keep the last part as it may be incomplete
      buffer = parts.pop() || "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const jsonStr = trimmed.slice(6);
            const event: SSEEvent = JSON.parse(jsonStr);
            yield event;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      try {
        const jsonStr = buffer.trim().slice(6);
        const event: SSEEvent = JSON.parse(jsonStr);
        yield event;
      } catch {
        // Skip malformed JSON
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unknown error occurred";
    yield { step: "error", data: {}, error: message };
  }
}
