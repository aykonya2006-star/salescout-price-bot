import type { PriceResult, Product, Reason } from "../src/types";

const reasons: readonly Reason[] = [
  "UNDERCUT",
  "AT_MIN",
  "AT_MAX",
  "NO_COMPETITORS",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPriceResult(value: unknown): value is PriceResult {
  return (
    isRecord(value) &&
    typeof value.sku === "string" &&
    typeof value.oldPrice === "number" &&
    Number.isFinite(value.oldPrice) &&
    typeof value.newPrice === "number" &&
    Number.isInteger(value.newPrice) &&
    value.newPrice >= 0 &&
    typeof value.reason === "string" &&
    reasons.some((reason) => reason === value.reason)
  );
}

export async function repriceProducts(
  products: Product[],
): Promise<PriceResult[]> {
  let response: Response;
  try {
    response = await fetch("/reprice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Сервер не ответил за 15 секунд. Повторите расчёт.");
    }
    throw new Error(
      "Не удалось связаться с сервером. Проверьте соединение и повторите расчёт.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "Сервер вернул некорректный ответ. Повторите расчёт."
        : `Сервис недоступен (HTTP ${response.status}). Повторите расчёт позже.`,
    );
  }

  if (!response.ok) {
    const message =
      isRecord(body) && typeof body.error === "string"
        ? body.error
        : `Ошибка сервера (HTTP ${response.status}).`;
    throw new Error(message);
  }

  if (
    !Array.isArray(body) ||
    body.length !== products.length ||
    !body.every(isPriceResult)
  ) {
    throw new Error("Сервер вернул некорректные результаты расчёта.");
  }
  const results: PriceResult[] = body;
  if (
    !results.every(
      (result, index) =>
        result.sku === products[index].sku &&
        result.oldPrice === products[index].myPrice,
    )
  ) {
    throw new Error(
      "Результаты сервера не соответствуют отправленным товарам.",
    );
  }
  return results;
}
