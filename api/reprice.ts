import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Self-contained Vercel adapter for the SaleScout portfolio demo.
 * Mirrors src/pricing.ts and server/validation.ts so the serverless runtime
 * does not need to resolve extensionless TypeScript imports in ESM.
 * The original implementation on main remains unchanged.
 */
type Competitor = { seller: string; price: number; inStock: boolean };
type Product = {
  sku: string; name: string; myPrice: number; minPrice: number;
  maxPrice: number; step: number; competitors: Competitor[];
};
type PriceResult = {
  sku: string; oldPrice: number; newPrice: number;
  reason: "NO_COMPETITORS" | "AT_MIN" | "AT_MAX" | "UNDERCUT";
};
type ApiRequest = IncomingMessage & { body?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function isCompetitor(value: unknown): value is Competitor {
  return isRecord(value)
    && typeof value.seller === "string"
    && isNonNegativeNumber(value.price)
    && typeof value.inStock === "boolean";
}
function isProduct(value: unknown): value is Product {
  return isRecord(value)
    && typeof value.sku === "string"
    && typeof value.name === "string"
    && isNonNegativeNumber(value.myPrice)
    && isNonNegativeNumber(value.minPrice)
    && Number.isInteger(value.minPrice)
    && isNonNegativeNumber(value.maxPrice)
    && Number.isInteger(value.maxPrice)
    && value.minPrice <= value.maxPrice
    && isNonNegativeNumber(value.step)
    && Array.isArray(value.competitors)
    && value.competitors.every(isCompetitor);
}
function parseProducts(body: unknown): { products: Product[] } | { error: string } {
  if (!Array.isArray(body)) {
    return { error: "Тело запроса должно быть JSON-массивом товаров Product[]." };
  }
  const products: Product[] = [];
  for (let index = 0; index < body.length; index++) {
    const entry: unknown = body[index];
    if (!isProduct(entry)) {
      return {
        error: `Некорректный товар по индексу ${index}: проверьте строки sku/name, конечные неотрицательные числа, целые minPrice/maxPrice (minPrice <= maxPrice) и массив competitors с seller, price, inStock.`
      };
    }
    products.push(entry);
  }
  return { products };
}
function calculatePrice(product: Product): PriceResult {
  let best = Infinity;
  for (const competitor of product.competitors) {
    if (competitor.inStock === true && competitor.price < best) {
      best = competitor.price;
    }
  }
  const original = { sku: product.sku, oldPrice: product.myPrice };
  if (best === Infinity) {
    return { ...original, newPrice: product.maxPrice, reason: "NO_COMPETITORS" };
  }
  const candidate = Math.floor(best - product.step);
  if (candidate < product.minPrice) {
    return { ...original, newPrice: product.minPrice, reason: "AT_MIN" };
  }
  if (candidate > product.maxPrice) {
    return { ...original, newPrice: product.maxPrice, reason: "AT_MAX" };
  }
  return { ...original, newPrice: candidate, reason: "UNDERCUT" };
}

function reply(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

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
  if (Buffer.isBuffer(input)) {
    input = input.toString("utf8");
  }
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      reply(res, 400, { error: "Некорректный JSON в теле запроса." });
      return;
    }
  }
  const parsed = parseProducts(input);
  if ("error" in parsed) {
    reply(res, 400, parsed);
    return;
  }
  reply(res, 200, parsed.products.map(calculatePrice));
}
