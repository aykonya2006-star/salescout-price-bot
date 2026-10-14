import { afterEach, describe, expect, it, vi } from "vitest";
import products from "../data/products.json";
import expected from "../data/expected.json";
import { repriceProducts } from "../frontend/api";

afterEach(() => vi.unstubAllGlobals());

function mockResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("frontend API client", () => {
  it("отправляет JSON-массив в POST /reprice и принимает результат", async () => {
    const fetchMock = mockResponse(expected);
    expect(await repriceProducts(products)).toEqual(expected);
    expect(fetchMock).toHaveBeenCalledWith("/reprice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(products),
      signal: expect.any(AbortSignal),
    });
  });

  it("принимает пустой результат для пустого массива", async () => {
    mockResponse([]);
    expect(await repriceProducts([])).toEqual([]);
  });

  it("показывает ошибку API", async () => {
    mockResponse({ error: "Некорректный товар" }, 400);
    await expect(repriceProducts(products)).rejects.toThrow(
      "Некорректный товар",
    );
  });

  it("показывает статус, если API не прислал сообщение", async () => {
    mockResponse({}, 503);
    await expect(repriceProducts(products)).rejects.toThrow("HTTP 503");
  });

  it.each([200, 502])("обрабатывает не-JSON ответ HTTP %s", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>Error</html>", { status })),
    );
    await expect(repriceProducts(products)).rejects.toThrow(
      status === 200 ? "некорректный ответ" : "HTTP 502",
    );
  });

  it.each(
    [
      {},
      [],
      [...expected, expected[0]],
      [{ ...expected[0], newPrice: 1.5 }, ...expected.slice(1)],
      [{ ...expected[0], newPrice: -1 }, ...expected.slice(1)],
      [{ ...expected[0], reason: "UNKNOWN" }, ...expected.slice(1)],
      [{ ...expected[0], oldPrice: null }, ...expected.slice(1)],
    ].map((body) => ({ body })),
  )("отклоняет повреждённые результаты %#", async ({ body }) => {
    mockResponse(body);
    await expect(repriceProducts(products)).rejects.toThrow(
      "некорректные результаты",
    );
  });

  it.each(
    [
      [...expected].reverse(),
      [{ ...expected[0], oldPrice: 1 }, ...expected.slice(1)],
    ].map((body) => ({ body })),
  )("проверяет соответствие SKU и исходных цен %#", async ({ body }) => {
    mockResponse(body);
    await expect(repriceProducts(products)).rejects.toThrow("не соответствуют");
  });

  it("обрабатывает сетевую ошибку", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(repriceProducts(products)).rejects.toThrow(
      "Не удалось связаться",
    );
  });

  it("обрабатывает таймаут", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")),
    );
    await expect(repriceProducts(products)).rejects.toThrow("15 секунд");
  });
});
