import type { Product, PriceResult } from "./types";

/**
 * Чистая функция: рассчитывает новую цену для одного товара.
 * Правила — см. README, раздел «Алгоритм».
 * Не меняйте сигнатуру и путь к файлу: решение проверяется автотестами.
 */
export function calculatePrice(product: Product): PriceResult {
  let best = Infinity;

  // Один проход без сортировки и spread: работает и с большим списком.
  for (const competitor of product.competitors) {
    if (competitor.inStock === true && competitor.price < best) {
      best = competitor.price;
    }
  }

  const original = { sku: product.sku, oldPrice: product.myPrice };

  if (best === Infinity) {
    return {
      ...original,
      newPrice: product.maxPrice,
      reason: "NO_COMPETITORS",
    };
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
