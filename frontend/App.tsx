import { useState } from "react";
import demoProducts from "../data/products.json";
import type { PriceResult, Product } from "../src/types";
import { repriceProducts } from "./api";
import { ProductTable } from "./ProductTable";

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      className={spinning ? "spin" : ""}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-1L20 9M4 15l2.4 3A7 7 0 0 0 17.9 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function App() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [results, setResults] = useState<PriceResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  function replaceProducts(next: Product[]) {
    setProducts(next);
    setResults(null);
    setError(null);
    setUpdatedAt(null);
  }

  async function calculate() {
    if (loading || products.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setUpdatedAt(null);
    try {
      const nextResults = await repriceProducts(products);
      setResults(nextResults);
      setUpdatedAt(new Date());
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Не удалось рассчитать цены.",
      );
    } finally {
      setLoading(false);
    }
  }

  const decreased = results?.filter(
    (result) => result.newPrice < result.oldPrice,
  ).length;
  const increased = results?.filter(
    (result) => result.newPrice > result.oldPrice,
  ).length;
  const limited = results?.filter(
    (result) => result.reason === "AT_MIN" || result.reason === "AT_MAX",
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#top"
          aria-label="SaleScout — начало страницы"
        >
          <span className="brand-mark" aria-hidden="true">
            S<span>↗</span>
          </span>
          SaleScout<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon" aria-hidden="true">
            ▦
          </span>
          <div>
            <strong>Демо-магазин</strong>
            <small>Рабочая область</small>
          </div>
        </div>
        <div className="nav-label">ИНСТРУМЕНТЫ</div>
        <nav aria-label="Навигация">
          <a className="nav-link active" href="#catalog">
            <span aria-hidden="true">↗</span>Переоценка товаров
          </a>
          <a className="nav-link" href="#rules">
            <span aria-hidden="true">≡</span>Правила расчёта
          </a>
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" aria-hidden="true" />
          <strong>Демонстрационный режим</strong>
          <p>Изучите переоценку на примере 6 товаров.</p>
        </div>
        <div className="sidebar-footer">
          SaleScout Price Bot<span>Тестовое задание · 2026</span>
        </div>
      </aside>

      <main id="top">
        <div className="topbar">
          <span>
            Рабочая область <span className="breadcrumb-separator">/</span>{" "}
            <strong>Управление ценами</strong>
          </span>
          <span className="currency-tag">Валюта: KZT ₸</span>
        </div>
        <div className="main-content">
          <header className="page-header">
            <div>
              <div className="eyebrow">УМНАЯ ПЕРЕОЦЕНКА</div>
              <h1>SaleScout Price Bot</h1>
              <p>
                Рассчитайте конкурентную цену для каждого товара,
                <br className="desktop-break" /> сохраняя заданные минимальные и
                максимальные границы.
              </p>
            </div>
            <button
              className="button primary calculate-button"
              disabled={loading || products.length === 0}
              onClick={() => void calculate()}
              aria-busy={loading}
            >
              <RefreshIcon spinning={loading} />
              {loading
                ? "Рассчитываем…"
                : results
                  ? "Пересчитать цены"
                  : "Рассчитать цены"}
            </button>
          </header>

          <section className="stats" aria-label="Сводка расчёта">
            <div className="stat">
              <span>Товаров в каталоге</span>
              <strong>
                {products.length}
                <span className="stat-symbol" aria-hidden="true">
                  ▦
                </span>
              </strong>
              <small>Демонстрационные данные</small>
            </div>
            <div className="stat">
              <span>Цены снижены</span>
              <strong>
                {decreased ?? "—"}
                <span className="stat-symbol decrease" aria-hidden="true">
                  ↘
                </span>
              </strong>
              <small>Ниже исходной цены</small>
            </div>
            <div className="stat">
              <span>Цены повышены</span>
              <strong>
                {increased ?? "—"}
                <span className="stat-symbol increase" aria-hidden="true">
                  ↗
                </span>
              </strong>
              <small>Выше исходной цены</small>
            </div>
            <div className="stat">
              <span>Ограничены диапазоном</span>
              <strong>
                {limited ?? "—"}
                <span className="stat-symbol" aria-hidden="true">
                  ↔
                </span>
              </strong>
              <small>Установлена min или max цена</small>
            </div>
          </section>

          {error && (
            <div className="error-banner" role="alert">
              <span aria-hidden="true">!</span>
              <div>
                <strong>Расчёт не выполнен</strong>
                <p>{error}</p>
              </div>
              <button
                className="button secondary"
                disabled={loading}
                onClick={() => void calculate()}
              >
                Повторить
              </button>
            </div>
          )}

          <section
            className="catalog-panel"
            id="catalog"
            aria-labelledby="catalog-title"
          >
            <div className="catalog-header">
              <div>
                <h2 id="catalog-title">
                  Каталог товаров{" "}
                  <span className="count-badge">{products.length}</span>
                </h2>
                <p>Сравнение с исходными ценами в тенге</p>
              </div>
              <div className="catalog-actions">
                <button
                  className="button secondary"
                  disabled={loading}
                  onClick={() => replaceProducts(demoProducts)}
                >
                  Загрузить демоданные
                </button>
                <button
                  className="button text-button"
                  disabled={loading || products.length === 0}
                  onClick={() => replaceProducts([])}
                >
                  Очистить
                </button>
              </div>
            </div>
            <div className="table-status" role="status" aria-live="polite">
              <span
                className={`status-dot ${results ? "success" : ""}`}
                aria-hidden="true"
              />
              {loading
                ? "Обрабатываем товары…"
                : error
                  ? "Проверьте соединение и повторите расчёт"
                  : results
                    ? `Обработано товаров: ${results.length}`
                    : products.length
                      ? "Готово к расчёту"
                      : "Загрузите товары для расчёта"}
              {updatedAt && (
                <span className="updated-at">
                  Обновлено в{" "}
                  {updatedAt.toLocaleTimeString("ru-KZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              )}
            </div>
            <ProductTable
              products={products}
              results={results}
              loading={loading}
              onLoadDemo={() => replaceProducts(demoProducts)}
            />
            <div className="table-footer">
              <span>
                Расчёт показывает рекомендации и не меняет исходные цены.
              </span>
              <span>Все цены в ₸</span>
            </div>
          </section>

          <section className="rules" id="rules" aria-labelledby="rules-title">
            <div className="rules-heading">
              <h2 id="rules-title">Как рассчитывается цена</h2>
              <span>Прозрачные правила для каждого товара</span>
            </div>
            <div className="rule-grid">
              <div className="rule">
                <span className="rule-number">01</span>
                <div>
                  <h3>Только товары в наличии</h3>
                  <p>Выбираем минимальную цену среди доступных конкурентов.</p>
                </div>
              </div>
              <div className="rule">
                <span className="rule-number">02</span>
                <div>
                  <h3>На шаг дешевле</h3>
                  <p>
                    Вычитаем шаг и округляем результат вниз до целого тенге.
                  </p>
                </div>
              </div>
              <div className="rule">
                <span className="rule-number">03</span>
                <div>
                  <h3>В пределах ваших границ</h3>
                  <p>
                    Ограничиваем цену диапазоном. Без конкурентов выбираем
                    максимум.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <footer className="page-footer">
            <span>SaleScout · Мини-версия прайс-бота</span>
            <span>Данные из официального тестового задания</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
