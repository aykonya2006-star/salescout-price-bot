import request from "supertest";
import { describe, expect, it } from "vitest";
import products from "../data/products.json";
import expected from "../data/expected.json";
import { app } from "../server/app";

describe("POST /reprice", () => {
  it("возвращает полный официальный результат в исходном порядке", async () => {
    const before = structuredClone(products);
    const response = await request(app).post("/reprice").send(products);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual(expected);
    expect(products).toEqual(before);
  });

  it("сохраняет порядок, в том числе для повторяющихся SKU", async () => {
    const payload = [products[3], products[0], { ...products[0], myPrice: 100.5 }];
    const response = await request(app).post("/reprice").send(payload);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([expected[3], expected[0], { ...expected[0], oldPrice: 100.5 }]);
  });

  it("принимает пустой массив", async () => {
    const response = await request(app).post("/reprice").send([]);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it.each(["{}", "null", '"string"', "10", "true"])("отклоняет тело не-массив %s", async (body) => {
    const response = await request(app).post("/reprice").set("Content-Type", "application/json").send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  it.each([
    null, {}, { ...products[0], sku: 123 }, { ...products[0], name: null },
    { ...products[0], myPrice: "100" }, { ...products[0], myPrice: -1 },
    { ...products[0], step: -0.5 }, { ...products[0], minPrice: 1.5 },
    { ...products[0], maxPrice: 1.5 }, { ...products[0], minPrice: 500000 },
    { ...products[0], competitors: {} }, { ...products[0], competitors: [null] },
    { ...products[0], competitors: [{ seller: "Shop", price: 100, inStock: "true" }] },
    { ...products[0], competitors: [{ seller: 1, price: 100, inStock: true }] },
    { ...products[0], competitors: [{ seller: "Shop", price: -1, inStock: false }] },
  ])("отклоняет неверный товар %# без частичного результата", async (invalid) => {
    const response = await request(app).post("/reprice").send([products[0], invalid]);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: expect.stringContaining("индексу 1") });
  });

  it("отклоняет неконечные числа после JSON-парсинга", async () => {
    const body = JSON.stringify([products[0]]).replace('"step":10', '"step":1e400');
    const response = await request(app).post("/reprice").set("Content-Type", "application/json").send(body);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  it("принимает дробные цены и шаг, а также нули и равные границы", async () => {
    const product = { ...products[0], sku: "", name: "", myPrice: 0.1, minPrice: 0, maxPrice: 0, step: 0.5, competitors: [{ seller: "", price: 0.1, inStock: true }] };
    const response = await request(app).post("/reprice").send([product]);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ sku: "", oldPrice: 0.1, newPrice: 0, reason: "AT_MIN" }]);
  });

  it("возвращает 400 для повреждённого JSON и продолжает работать", async () => {
    const response = await request(app).post("/reprice").set("Content-Type", "application/json").send("[{broken");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: expect.any(String) });
    expect((await request(app).post("/reprice").send([])).status).toBe(200);
  });

  it("отклоняет отсутствующее тело", async () => {
    const response = await request(app).post("/reprice").set("Content-Type", "application/json");
    expect(response.status).toBe(400);
  });

  it("требует Content-Type application/json", async () => {
    const response = await request(app).post("/reprice").set("Content-Type", "text/plain").send("[]");
    expect(response.status).toBe(415);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  it("ограничивает размер тела", async () => {
    const response = await request(app).post("/reprice").send([{ ...products[0], name: "x".repeat(1024 * 1024) }]);
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: expect.any(String) });
  });

  it("возвращает JSON 404 для неизвестного маршрута", async () => {
    const response = await request(app).get("/missing");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: expect.any(String) });
  });
});
