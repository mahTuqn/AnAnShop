import type { Product } from "../types";

export default function ListingPage({ search, query, setQuery, category, setCategory, categoryLabels, sizeFilter, setSizeFilter, minPrice, setMinPrice, maxPrice, setMaxPrice, sort, setSort, shown, Empty, Card, Icon }: any) {
  return (

    <main className="page-wrap">
      {search && (
        <div className="search-hero">
          <p className="kicker">TÌM KIẾM</p>
          <h1>Tìm điều mẹ cần</h1>
          <div className="big-search">
            <Icon name="search" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên sản phẩm, chất liệu..."
            />
          </div>
        </div>
      )}
      <section className="listing-head">
        <div>
          <p className="kicker">BỘ SƯU TẬP</p>
          <h1>
            {search && query
              ? `Kết quả cho “${query}”`
              : category === "all"
                ? "Tất cả sản phẩm"
                : categoryLabels[category]}
          </h1>
          <p>Thông tin rõ ràng, dễ chọn theo từng giai đoạn.</p>
        </div>
        <span>{shown.length} sản phẩm</span>
      </section>
      <div className="catalog">
        <aside className="filters">
          <b>Lọc sản phẩm</b>
          <hr />
          <label>Danh mục</label>
          {(
            ["all", ...Object.keys(categoryLabels)] as (
              Product["category"] | "all"
            )[]
          ).map((k) => (
            <button
              className={`filter-option ${category === k ? "selected" : ""}`}
              onClick={() => setCategory(k)}
              key={k}
            >
              <span className="checkbox">{category === k ? "✓" : ""}</span>
              {k === "all" ? "Tất cả" : categoryLabels[k]}
            </button>
          ))}
          <hr />
          <label>Giá</label>
          <div className="price-filter">
            <input
              type="number"
              placeholder="Từ"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />{" "}
            -{" "}
            <input
              type="number"
              placeholder="Đến"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <hr />
          <label>Kích thước</label>
          <div className="size-mini">
            {["S", "M", "L", "XL", "0–3M"].map((s) => (
              <button
                className={sizeFilter === s ? "active" : ""}
                onClick={() => setSizeFilter(sizeFilter === s ? "" : s)}
                key={s}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>
        <div className="catalog-main">
          <div className="catalog-tools">
            <span>Hiển thị {shown.length} sản phẩm</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="popular">Phổ biến</option>
              <option value="asc">Giá tăng dần</option>
              <option value="desc">Giá giảm dần</option>
            </select>
          </div>
          {shown.length ? (
            <div className="product-grid">
              {shown.map((p: any) => (
                <Card p={p} key={p.id} />
              ))}
            </div>
          ) : (
            <Empty
              title="Không tìm thấy sản phẩm"
              copy="Thử từ khóa hoặc bộ lọc khác."
              action={() => {
                setQuery("");
                setCategory("all");
                setSizeFilter("");
              }}
            />
          )}
        </div>
      </div>
    </main>
  
  );
}