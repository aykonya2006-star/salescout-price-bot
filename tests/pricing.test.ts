import { describe, expect, it } from "vitest";
import products from "../data/products.json";
import expected from "../data/expected.json";
import { calculatePrice } from "../src/pricing";
import type { Competitor, Product, Reason } from "../src/types";

const competitor = (price: number, inStock = true): Competitor => ({
  seller: "Shop", price, inStock,
});

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    sku: "SKU / 001", name: "Test product", myPrice: 120.75,
    minPrice: 50, maxPrice: 200, step: 10,
    competitors: [competitor(110)], ...overrides,
  };
}

interface Case {
  name: string;
  input: Partial<Product>;
  newPrice: number;
  reason: Reason;
}

const cases: Case[] = [
  { name: "обычный расчёт", input: {}, newPrice: 100, reason: "UNDERCUT" },
  { name: "пустой список", input: { competitors: [] }, newPrice: 200, reason: "NO_COMPETITORS" },
  { name: "все отсутствуют", input: { competitors: [competitor(1, false), competitor(80, false)] }, newPrice: 200, reason: "NO_COMPETITORS" },
  { name: "самый дешёвый доступный", input: { competitors: [competitor(150), competitor(1, false), competitor(90), competitor(100)] }, newPrice: 80, reason: "UNDERCUT" },
  { name: "одинаковые минимумы", input: { competitors: [competitor(100), competitor(100), competitor(120)] }, newPrice: 90, reason: "UNDERCUT" },
  { name: "нижнее ограничение", input: { competitors: [competitor(40)] }, newPrice: 50, reason: "AT_MIN" },
  { name: "верхнее ограничение", input: { competitors: [competitor(250)] }, newPrice: 200, reason: "AT_MAX" },
  { name: "точно minPrice", input: { competitors: [competitor(60)] }, newPrice: 50, reason: "UNDERCUT" },
  { name: "точно maxPrice", input: { competitors: [competitor(210)] }, newPrice: 200, reason: "UNDERCUT" },
  { name: "нулевой шаг", input: { step: 0 }, newPrice: 110, reason: "UNDERCUT" },
  { name: "дробный шаг", input: { step: 0.5 }, newPrice: 109, reason: "UNDERCUT" },
  { name: "дробная цена", input: { competitors: [competitor(110.9)] }, newPrice: 100, reason: "UNDERCUT" },
  { name: "оба числа дробные", input: { competitors: [competitor(110.9)], step: 0.5 }, newPrice: 110, reason: "UNDERCUT" },
  { name: "округление вниз, не до ближайшего", input: { competitors: [competitor(110.9)], step: 0 }, newPrice: 110, reason: "UNDERCUT" },
  { name: "отрицательный кандидат", input: { minPrice: 0, step: 0.5, competitors: [competitor(0.1)] }, newPrice: 0, reason: "AT_MIN" },
  { name: "нулевая цена", input: { minPrice: 0, step: 0, competitors: [competitor(0)] }, newPrice: 0, reason: "UNDERCUT" },
  { name: "равные границы, кандидат ниже", input: { minPrice: 100, maxPrice: 100, competitors: [competitor(90)] }, newPrice: 100, reason: "AT_MIN" },
  { name: "равные границы, кандидат выше", input: { minPrice: 100, maxPrice: 100, competitors: [competitor(120)] }, newPrice: 100, reason: "AT_MAX" },
  { name: "равные границы, точное совпадение", input: { minPrice: 100, maxPrice: 100 }, newPrice: 100, reason: "UNDERCUT" },
  { name: "равные границы, нет конкурентов", input: { minPrice: 100, maxPrice: 100, competitors: [] }, newPrice: 100, reason: "NO_COMPETITORS" },
  { name: "старая цена не влияет", input: { myPrice: 999.25 }, newPrice: 100, reason: "UNDERCUT" },
];

describe("calculatePrice", () => {
  it.each(cases)("$name", ({ input, newPrice, reason }) => {
    const product = makeProduct(input);
    expect(calculatePrice(product)).toEqual({
      sku: product.sku, oldPrice: product.myPrice, newPrice, reason,
    });
  });

  it("совпадает со всеми официальными данными expected.json", () => {
    expect(products.map(calculatePrice)).toEqual(expected);
  });

  it.each([
    [384990, 10, 370000, 420000, 384980, "UNDERCUT"],
    [175000, 100, 180000, 210000, 180000, "AT_MIN"],
    [150000, 1, 100000, 125000, 125000, "AT_MAX"],
    [349999.9, 0.5, 330000, 380000, 349999, "UNDERCUT"],
  ] as const)("пример README: best=%s, step=%s", (best, step, minPrice, maxPrice, newPrice, reason) => {
    const product = makeProduct({ step, minPrice, maxPrice, competitors: [competitor(best)] });
    expect(calculatePrice(product)).toEqual({ sku: product.sku, oldPrice: product.myPrice, newPrice, reason });
  });

  it("не меняет замороженные входные данные и возвращает независимые результаты", () => {
    const product = makeProduct({ competitors: [competitor(150), competitor(90)] });
    const before = structuredClone(product);
    product.competitors.forEach(Object.freeze);
    Object.freeze(product.competitors);
    Object.freeze(product);
    const first = calculatePrice(product);
    const second = calculatePrice(product);
    expect(product).toEqual(before);
    expect(first).toEqual({ sku: product.sku, oldPrice: product.myPrice, newPrice: 80, reason: "UNDERCUT" });
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });

  it("обрабатывает 200 000 конкурентов без ограничения spread-аргументов", () => {
    const competitors = Array.from({ length: 200_000 }, (_, index) => competitor(1000 + index));
    competitors[competitors.length - 1] = competitor(90);
    expect(calculatePrice(makeProduct({ competitors }))).toEqual({
      sku: "SKU / 001", oldPrice: 120.75, newPrice: 80, reason: "UNDERCUT",
    });
  });
});
