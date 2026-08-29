import type { Product } from "../types";

export default function HomePage({ go, setCategory, products, categoryLabels, Card, Icon, notify }: any) {
  return (

    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">NHẸ NHÀNG CÙNG MẸ</p>
          <h1>
            Chạm vào những
            <br />
            ngày dịu dàng.
          </h1>
          <p>
            Thiết kế nâng niu cơ thể mẹ, đồng hành cùng hành trình lớn khôn của
            bé.
          </p>
          <button className="btn primary" onClick={() => go("/products")}>
            Khám phá bộ sưu tập <Icon name="arrow" />
          </button>
        </div>
        <div className="hero-photo">
          <img
            src="https://images.unsplash.com/photo-1610433091859-80d1893d10e8?w=1300&h=1450&fit=crop&auto=format"
            alt="Mẹ bầu trong không gian ấm áp"
          />
        </div>
      </section>
      <section className="categories">
        <p className="kicker">DÀNH RIÊNG CHO BẠN</p>
        <h2>Tìm đúng điều mẹ cần</h2>
        <div className="category-grid">
          {(
            ["maternity", "postpartum", "newborn"] as Product["category"][]
          ).map((k, i) => (
            <button
              className="category"
              key={k}
              onClick={() => {
                setCategory(k);
                go("/products");
              }}
            >
              <img src={products[i].images[0]} alt="" />
              <span>
                <b>{categoryLabels[k]}</b>
                <Icon name="arrow" />
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="best">
        <div className="section-heading">
          <div>
            <p className="kicker">ĐƯỢC MẸ YÊU THÍCH</p>
            <h2>Những điều dịu dàng nhất</h2>
          </div>
          <button className="text-link" onClick={() => go("/products")}>
            Xem tất cả →
          </button>
        </div>
        <div className="products">
          {products.slice(0, 4).map((p: any) => (
            <Card p={p} key={p.id} />
          ))}
        </div>
      </section>
      <section className="story">
        <div>
          <p className="kicker">LỜI HỨA AN AN</p>
          <h2>Điều lành, từ nguồn gốc rõ ràng.</h2>
          <p>
            Mỗi chất liệu và đường may đều được chọn vì sự an tâm của mẹ và bé.
          </p>
          <button className="text-link" onClick={() => go("/about")}>
            Câu chuyện An An →
          </button>
        </div>
        <div className="promise">
          <span>01</span>
          <b>Chất liệu an toàn</b>
          <p>Ưu tiên cotton, linen và modal chọn lọc.</p>
          <span>02</span>
          <b>Thiết kế thấu hiểu</b>
          <p>Phù hợp cơ thể thay đổi trong và sau thai kỳ.</p>
          <span>03</span>
          <b>Đổi trả dễ dàng</b>
          <p>Hỗ trợ đổi size trong 14 ngày.</p>
        </div>
      </section>
      <section className="newsletter">
        <p className="kicker">THƯ TỪ AN AN</p>
        <h2>Nhận ưu đãi dành riêng cho mẹ</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            notify("Đăng ký nhận tin thành công");
          }}
        >
          <input
            type="email"
            required
            aria-label="Email"
            placeholder="Email của mẹ"
          />
          <button className="btn primary">Đăng ký</button>
        </form>
      </section>
    </main>
  
  );
}