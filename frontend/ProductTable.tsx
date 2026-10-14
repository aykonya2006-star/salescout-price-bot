import type { PriceResult, Product } from "../src/types";
import {
  formatDelta,
  formatPrice,
  reasonDescriptions,
  reasonLabels,
} from "./format";

interface Props {
  products: Product[];
  results: PriceResult[] | null;
  loading: boolean;
  onLoadDemo: () => void;
}

export function ProductTable({
  products,
  results,
  loading,
  onLoadDemo,
}: Props) {
  if (products.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">
          ▦
        </span>
        <h3>В каталоге пока нет товаров</h3>
        <p>Загрузите демонстрационные товары, чтобы проверить расчёт цен.</p>
        <button className="button primary" onClick={onLoadDemo}>
          Загрузить демоданные
        </button>
      </div>
    );
  }

  return (
    <>
      <p className="mobile-table-hint">
        Прокрутите вправо, чтобы увидеть расчёт{" "}
        <span aria-hidden="true">→</span>
      </p>
      <div
        className="table-scroll"
        role="region"
        aria-label="Цены товаров; на узком экране прокрутите таблицу вправо"
        tabIndex={0}
      >
        <table aria-busy={loading}>
          <caption className="sr-only">
            Сравнение исходных и рассчитанных цен в тенге
          </caption>
          <thead>
            <tr>
              <th scope="col">SKU</th>
              <th scope="col">Товар</th>
              <th scope="col" className="numeric">
                Старая цена
              </th>
              <th scope="col" className="numeric">
                Новая цена
              </th>
              <th scope="col" className="numeric">
                Изменение
              </th>
              <th scope="col">Причина</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => {
              const result = results?.[index];
              const delta = result ? result.newPrice - result.oldPrice : null;
              return (
                <tr key={`${product.sku}-${index}`}>
                  <td className="sku">{product.sku}</td>
                  <td>
                    <div className="product-name">{product.name}</div>
                    <div className="product-detail">
                      Доступных конкурентов:{" "}
                      {
                        product.competitors.filter(
                          (item) => item.inStock === true,
                        ).length
                      }
                    </div>
                  </td>
                  <td className="numeric old-price">
                    {formatPrice(result?.oldPrice ?? product.myPrice)}
                  </td>
                  <td
                    className={`numeric new-price ${loading ? "pending" : ""}`}
                  >
                    {result ? (
                      formatPrice(result.newPrice)
                    ) : (
                      <span className="placeholder">—</span>
                    )}
                  </td>
                  <td
                    className={`numeric delta ${delta === null || delta === 0 ? "" : delta > 0 ? "increase" : "decrease"}`}
                  >
                    {delta === null ? (
                      <span className="placeholder">—</span>
                    ) : (
                      formatDelta(delta)
                    )}
                  </td>
                  <td>
                    {result ? (
                      <span
                        className={`reason reason-${result.reason.toLowerCase()}`}
                        title={reasonDescriptions[result.reason]}
                      >
                        {reasonLabels[result.reason]}
                      </span>
                    ) : (
                      <span className="awaiting">
                        {loading ? "Расчёт…" : "Ожидает расчёта"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
