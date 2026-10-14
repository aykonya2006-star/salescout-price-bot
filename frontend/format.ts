import type { Reason } from "../src/types";

const currency = new Intl.NumberFormat("ru-KZ", {
  style: "currency",
  currency: "KZT",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(price: number): string {
  return currency.format(price);
}

export function formatDelta(delta: number): string {
  if (delta === 0) return "Без изменений";
  return `${delta > 0 ? "+" : "−"}${formatPrice(Math.abs(delta))}`;
}

export const reasonLabels: Record<Reason, string> = {
  UNDERCUT: "Ниже конкурента",
  AT_MIN: "Минимальная цена",
  AT_MAX: "Максимальная цена",
  NO_COMPETITORS: "Нет конкурентов",
};

export const reasonDescriptions: Record<Reason, string> = {
  UNDERCUT:
    "Цена конкурента минус шаг, с округлением вниз. Точное совпадение с границей также относится к этой причине.",
  AT_MIN: "Рассчитанная цена ниже допустимой. Установлена минимальная цена.",
  AT_MAX: "Рассчитанная цена выше допустимой. Установлена максимальная цена.",
  NO_COMPETITORS:
    "Нет конкурентов с товаром в наличии. Установлена максимальная цена.",
};
