import express from "express";
import type { ErrorRequestHandler, Request } from "express";
import { calculatePrice } from "../src/pricing";
import { parseProducts } from "./validation";

export const app = express();
app.disable("x-powered-by");
// strict:false позволяет вернуть одинаковый JSON-ответ 400 и для JSON-примитивов.
app.use(express.json({ limit: "1mb", strict: false }));

app.post("/reprice", (req: Request<Record<string, never>, unknown, unknown>, res) => {
  if (!req.is("application/json")) {
    res.status(415).json({ error: "Используйте Content-Type: application/json." });
    return;
  }

  const parsed = parseProducts(req.body);
  if ("error" in parsed) {
    res.status(400).json(parsed);
    return;
  }

  res.json(parsed.products.map(calculatePrice));
});

app.use((_req, res) => {
  res.status(404).json({ error: "Маршрут не найден." });
});

const handleError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const type = typeof error === "object" && error !== null && "type" in error ? error.type : undefined;
  if (type === "entity.parse.failed") {
    res.status(400).json({ error: "Некорректный JSON в теле запроса." });
  } else if (type === "entity.too.large") {
    res.status(413).json({ error: "Тело запроса превышает лимит 1 МБ." });
  } else {
    console.error("Unexpected API error:", error);
    res.status(500).json({ error: "Не удалось рассчитать цены. Повторите запрос позже." });
  }
};
app.use(handleError);
