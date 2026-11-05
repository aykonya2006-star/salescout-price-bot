import type { IncomingMessage, ServerResponse } from "node:http";
import { calculatePrice } from "../src/pricing";
import { parseProducts } from "../server/validation";

type ApiRequest = IncomingMessage & { body?: unknown };
function reply(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

// Vercel-only adapter for the original /reprice functionality.
// The original Express development server is intentionally unchanged.
export default function handler(req: ApiRequest, res: ServerResponse): void {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    reply(res, 405, { error: "Используйте POST /reprice." });
    return;
  }
  const contentType = req.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    reply(res, 415, { error: "Используйте Content-Type: application/json." });
    return;
  }
  const lengthHeader = req.headers["content-length"];
  if (typeof lengthHeader === "string" && Number(lengthHeader) > 1024 * 1024) {
    reply(res, 413, { error: "Тело запроса превышает лимит 1 МБ." });
    return;
  }
  let input = req.body;
  if (typeof input === "string") {
    try { input = JSON.parse(input); }
    catch { reply(res, 400, { error: "Некорректный JSON в теле запроса." }); return; }
  }
  const parsed = parseProducts(input);
  if ("error" in parsed) {
    reply(res, 400, parsed);
    return;
  }
  reply(res, 200, parsed.products.map(calculatePrice));
}
