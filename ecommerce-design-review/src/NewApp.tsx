import CheckoutPage from "./pages/CheckoutPage";
import CartPage from "./pages/CartPage";
import ListingPage from "./pages/ListingPage";
import HomePage from "./pages/HomePage";
import { useEffect, useMemo, useState } from "react";
import {
  categoryLabels,
  defaultAddress,
  formatMoney,
  products,
  seedOrders,
} from "./data";
import type { CartItem, Order, OrderStatus, Product } from "./types";
import { api } from "./api";
import AdminPage from "./pages/AdminPage";

const paths: Record<string, string> = {
  search: "M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Zm4.6-1.9L20 20",
  bag: "M5 8h14l-1 12H6L5 8Zm4 1V6a3 3 0 0 1 6 0v3",
  heart:
    "M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z",
  user: "M20 21a8 8 0 0 0-16 0m12-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  menu: "M3 6h18M3 12h18M3 18h18",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  x: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  filter: "M4 6h16M7 12h10m-7 6h4",
  truck:
    "M3 5h11v11H3V5Zm11 4h4l3 3v4h-7V9ZM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  trash: "M4 7h16m-10 4v6m4-6v6M9 7V4h6v3m-9 0 1 14h10l1-14",
  location:
    "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  package: "m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7m-8 4v10",
};
const Icon = ({
  name,
  size = 20,
  fill = false,
}: {
  name: string;
  size?: number;
  fill?: boolean;
}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={paths[name]} />
  </svg>
);
const current = () => location.hash.slice(1) || "/";
const status: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export default function NewApp() {
  const [route, setRoute] = useState(current()),
    [cart, setCart] = useState<CartItem[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("cart") || "[]");
      } catch {
        return [];
      }
    }),
    [wish, setWish] = useState<number[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("wish") || "[3]");
      } catch {
        return [3];
      }
    }),
    [orders, setOrders] = useState<Order[]>(seedOrders),
    [drawer, setDrawer] = useState(false),
    [mobile, setMobile] = useState(false),
    [logged, setLogged] = useState(false),
    [currentUser, setCurrentUser] = useState<any>(null),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState<Product["category"] | "all">("all"),
    [sizeFilter, setSizeFilter] = useState(""),
    [sort, setSort] = useState("popular"),
    [selectedSize, setSelectedSize] = useState(""),
    [selectedColor, setSelectedColor] = useState(""),
    [image, setImage] = useState(0),
    [error, setError] = useState(""),
    [step, setStep] = useState(1),
    [ship, setShip] = useState<"standard" | "express">("standard"),
    [pay, setPay] = useState("cod"),
    [terms, setTerms] = useState(false),
    [discount, setDiscount] = useState(0),
    [coupon, setCoupon] = useState(""),
    [adminTab, setAdminTab] = useState("overview"),
    [minPrice, setMinPrice] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [history, setHistory] = useState<number[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("history") || "[]");
      } catch {
        return [];
      }
    });
  const [address, setAddress] = useState(defaultAddress);
  const go = (to: string) => {
    location.hash = to;
  };
  useEffect(() => {
    const fn = () => {
      setRoute(current());
      setDrawer(false);
      setMobile(false);
      scrollTo(0, 0);
    };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    api.auth.me().then((res) => {
      if (res.success) {
        setLogged(true);
        setCurrentUser(res.data);
      }
    });
  }, []);
  useEffect(() => {
    document.title = route.startsWith("/admin")
      ? "Quản trị | An An Shop"
      : "An An Shop – Dịu dàng cùng mẹ và bé";
  }, [route]);
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem("wish", JSON.stringify(wish));
  }, [wish]);
  useEffect(() => {
    localStorage.setItem("history", JSON.stringify(history));
  }, [history]);
  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };
  const count = cart.reduce((s, i) => s + i.quantity, 0),
    subtotal = cart.reduce(
      (s, i) =>
        s +
        (products.find((p) => p.id === i.productId)?.price || 0) * i.quantity,
      0,
    ),
    shipping = ship === "express" ? 45000 : subtotal >= 699000 ? 0 : 30000,
    total = Math.max(0, subtotal + shipping - discount);
  const toggleWish = (id: number) => {
    setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
    notify("Đã cập nhật danh sách yêu thích");
  };
  const add = (p: Product, buy = false) => {
    if (!logged) {
      notify("Vui lòng đăng nhập để mua hàng");
      go("/login");
      return;
    }
    const color = selectedColor || p.colors[0].name,
      variant = p.sizes.find((s) => s.name === selectedSize);
    if (!selectedSize) {
      setError("Vui lòng chọn kích thước.");
      return;
    }
    if (!variant?.stock) {
      setError("Kích thước này đã hết hàng.");
      return;
    }
    setCart((c) => {
      const i = c.findIndex(
        (x) =>
          x.productId === p.id && x.size === selectedSize && x.color === color,
      );
      if (i < 0)
        return [
          ...c,
          { productId: p.id, size: selectedSize, color, quantity: 1 },
        ];
      return c.map((x, n) =>
        n === i ? { ...x, quantity: x.quantity + 1 } : x,
      );
    });
    setError("");
    notify("Đã thêm vào giỏ hàng");
    buy ? go("/checkout") : setDrawer(true);
  };
  const update = (index: number, qty: number) =>
    setCart((c) =>
      qty < 1
        ? c.filter((_, i) => i !== index)
        : c.map((x, i) => (i === index ? { ...x, quantity: qty } : x)),
    );
  const shown = useMemo(() => {
    let a = products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!query ||
          `${p.name} ${p.material}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!sizeFilter ||
          p.sizes.some((s) => s.name === sizeFilter && s.stock)) &&
        (!minPrice || p.price >= Number(minPrice)) &&
        (!maxPrice || p.price <= Number(maxPrice)),
    );
    if (sort === "asc") a = [...a].sort((x, y) => x.price - y.price);
    if (sort === "desc") a = [...a].sort((x, y) => y.price - x.price);
    return a;
  }, [category, query, sizeFilter, sort, minPrice, maxPrice]);
  const Card = ({ p }: { p: Product }) => (
    <article className="product-card enhanced-card">
      <button
        className="product-open"
        onClick={() => {
          setSelectedSize("");
          setSelectedColor("");
          setImage(0);
          go(`/product/${p.slug}`);
        }}
      >
        <span className="product-image" style={{ background: p.tone }}>
          <img src={p.images[0]} alt={p.name} />
          {p.badge && <span className="badge">{p.badge}</span>}
        </span>
        <span className="product-copy">
          <small className="eyebrow">{p.categoryLabel.toUpperCase()}</small>
          <b className="product-name">{p.name}</b>
          <span>
            <strong>{formatMoney(p.price)}</strong>
            {p.oldPrice && <del>{formatMoney(p.oldPrice)}</del>}
          </span>
          <small>
            ★ {p.rating} <i>({p.reviews})</i>
          </small>
        </span>
      </button>
      <button
        className={`love ${wish.includes(p.id) ? "selected" : ""}`}
        onClick={() => toggleWish(p.id)}
        aria-label="Yêu thích"
      >
        <Icon name="heart" />
      </button>
    </article>
  );
  const Header = () => (
    <>
      <div className="announcement">
        Miễn phí vận chuyển cho đơn từ 699.000₫ <span>•</span> Đổi size trong 14
        ngày
      </div>
      <header>
        <button
          className="mobile-only icon-btn"
          onClick={() => setMobile(true)}
          aria-label="Mở menu"
        >
          <Icon name="menu" />
        </button>
        <button className="logo" onClick={() => go("/")}>
          an an<span>.</span>
        </button>
        <nav>
          {(Object.keys(categoryLabels) as Product["category"][]).map((k) => (
            <button
              key={k}
              onClick={() => {
                setCategory(k);
                go("/products");
              }}
            >
              {categoryLabels[k]}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="search-action" onClick={() => go("/search")}>
            <Icon name="search" />
            <span>Tìm sản phẩm</span>
          </button>
          <button
            className="desktop-only user-status"
            onClick={() => go(logged ? "/account" : "/login")}
            aria-label="Tài khoản"
          >
            <Icon name="user" />
            {logged && (
              <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 500 }}>
                {currentUser?.fullName?.split(" ").pop()}
              </span>
            )}
          </button>
          <button
            className="desktop-only"
            onClick={() => go("/account/wishlist")}
            aria-label="Yêu thích"
          >
            <Icon name="heart" />
          </button>
          <button
            className="cart-button"
            onClick={() => setDrawer(true)}
            aria-label="Giỏ hàng"
          >
            <Icon name="bag" />
            {count > 0 && <i>{count}</i>}
          </button>
        </div>
      </header>
      {mobile && (
        <>
          <button
            className="scrim"
            onClick={() => setMobile(false)}
            aria-label="Đóng"
          />
          <aside className="mobile-menu">
            <div className="drawer-title">
              <b className="logo">an an.</b>
              <button className="icon-btn" onClick={() => setMobile(false)}>
                <Icon name="x" />
              </button>
            </div>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <button
                key={k}
                onClick={() => {
                  setCategory(k as Product["category"]);
                  go("/products");
                }}
              >
                {v} →
              </button>
            ))}
            <button onClick={() => go(logged ? "/account" : "/login")}>
              {logged ? currentUser?.fullName : "Tài khoản"}
            </button>
          </aside>
        </>
      )}
    </>
  );
  const Footer = () => (
    <footer className="site-footer">
      <div>
        <b className="logo light">an an.</b>
        <p>Thiết kế dịu dàng, an toàn và thấu hiểu dành cho mẹ và bé.</p>
      </div>
      <div>
        <h3>Mua sắm</h3>
        <button onClick={() => go("/products")}>Sản phẩm</button>
        <button onClick={() => go("/promotions")}>Khuyến mãi</button>
        <button onClick={() => go("/size-guide")}>Chọn size</button>
      </div>
      <div>
        <h3>Hỗ trợ</h3>
        <button onClick={() => go("/faq")}>Câu hỏi thường gặp</button>
        <button onClick={() => go("/policy")}>Vận chuyển & đổi trả</button>
        <button onClick={() => go("/contact")}>Liên hệ</button>
      </div>
      <div>
        <h3>Về An An</h3>
        <button onClick={() => go("/about")}>Câu chuyện</button>
        <button onClick={() => go("/journal")}>Cẩm nang</button>
        <p>
          1900 6868
          <br />
          hello@ananshop.vn
        </p>
      </div>
    </footer>
  );
  const Empty = ({
    title,
    copy,
    action,
  }: {
    title: string;
    copy: string;
    action?: () => void;
  }) => (
    <div className="empty-state">
      <Icon name="bag" size={32} />
      <h2>{title}</h2>
      <p>{copy}</p>
      {action && (
        <button className="btn primary" onClick={action}>
          Khám phá sản phẩm
        </button>
      )}
    </div>
  );
  const Home = () => <HomePage go={go} setCategory={setCategory} products={products} categoryLabels={categoryLabels} Card={Card} Icon={Icon} notify={notify} />;
  const Listing = ({ search = false }: { search?: boolean }) => <ListingPage search={search} query={query} setQuery={setQuery} category={category} setCategory={setCategory} categoryLabels={categoryLabels} sizeFilter={sizeFilter} setSizeFilter={setSizeFilter} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} sort={sort} setSort={setSort} shown={shown} Empty={Empty} Card={Card} Icon={Icon} />;
  const Detail = ({ p }: { p: Product }) => {

    const color = selectedColor || p.colors[0].name;
    return (
      <main className="page-wrap detail">
        <div className="breadcrumbs">
          <button onClick={() => go("/")}>Trang chủ</button> / {p.categoryLabel}{" "}
          / {p.name}
        </div>
        <div className="detail-grid">
          <div className="gallery">
            <div className="main-photo">
              <img src={p.images[image] || p.images[0]} alt={p.name} />
              {p.badge && <span className="badge">{p.badge}</span>}
            </div>
            <div className="thumbs">
              {p.images.map((src, i) => (
                <button
                  className={image === i ? "selected" : ""}
                  onClick={() => setImage(i)}
                  key={src}
                >
                  <img src={src} alt={`Ảnh ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
          <section className="detail-info">
            <p className="kicker">{p.categoryLabel.toUpperCase()}</p>
            <div className="title-line">
              <h1>{p.name}</h1>
              <button
                className={`icon-btn ${wish.includes(p.id) ? "selected" : ""}`}
                onClick={() => toggleWish(p.id)}
              >
                <Icon name="heart" fill={wish.includes(p.id)} />
              </button>
            </div>
            <p className="rating">
              ★ {p.rating} <u>{p.reviews} đánh giá</u>
            </p>
            <div className="price">
              <strong>{formatMoney(p.price)}</strong>
              {p.oldPrice && <del>{formatMoney(p.oldPrice)}</del>}
            </div>
            <p className="description">{p.description}</p>
            <div className="selector">
              <div>
                <b>Màu sắc</b>
                <small>{color}</small>
              </div>
              <div className="colors">
                {p.colors.map((c) => (
                  <button
                    aria-label={c.name}
                    className={`color ${color === c.name ? "selected" : ""}`}
                    style={{ background: c.value }}
                    onClick={() => setSelectedColor(c.name)}
                    key={c.name}
                  />
                ))}
              </div>
            </div>
            <div className={`selector ${error ? "has-error" : ""}`}>
              <div>
                <b>Kích thước</b>
                <button className="guide" onClick={() => go("/size-guide")}>
                  Hướng dẫn chọn size
                </button>
              </div>
              <div className="sizes">
                {p.sizes.map((s) => (
                  <button
                    disabled={!s.stock}
                    className={selectedSize === s.name ? "selected" : ""}
                    onClick={() => {
                      setSelectedSize(s.name);
                      setError("");
                    }}
                    key={s.name}
                  >
                    {s.name}
                    {!s.stock && <small>Hết hàng</small>}
                  </button>
                ))}
              </div>
              {error && <p className="field-error">{error}</p>}
            </div>
            <p className="stock">
              <Icon name="check" size={17} /> Còn hàng · Giao trong 2–4 ngày
            </p>
            <div className="buy-row">
              <button className="btn secondary" onClick={() => add(p)}>
                Thêm vào giỏ
              </button>
              <button className="btn primary" onClick={() => add(p, true)}>
                Mua ngay
              </button>
            </div>
            <div className="policies">
              <span>
                <Icon name="truck" /> Miễn phí ship từ 699.000₫
              </span>
              <span>↺ Đổi size trong 14 ngày</span>
            </div>
            <div className="accordions">
              <details open>
                <summary>Mô tả sản phẩm</summary>
                <p>{p.description}</p>
              </details>
              <details>
                <summary>Chất liệu & bảo quản</summary>
                <p>
                  {p.material}. Giặt nhẹ bằng nước mát, phơi trong bóng râm.
                </p>
              </details>
              <details>
                <summary>Thông số & bảng size</summary>
                <p>
                  Phù hợp: {p.stage}. Nếu nằm giữa hai size, ưu tiên size lớn
                  hơn.
                </p>
              </details>
            </div>
          </section>
        </div>
        <section className="reviews-section">
          <div>
            <p className="kicker">ĐÁNH GIÁ THỰC TẾ</p>
            <h2>Mẹ nói gì về sản phẩm</h2>
            <strong>{p.rating}/5</strong>
            <span>★★★★★</span>
          </div>
          <div>
            {[
              "Vải mềm, form đẹp và rất thoải mái.",
              "Tư vấn size nhanh, đóng gói chỉn chu.",
              "Sản phẩm giống ảnh, mình sẽ mua thêm.",
            ].map((x, i) => (
              <article key={x}>
                <span>★★★★★</span>
                <b>
                  {["Minh Anh", "Thu Trang", "Mỹ Duyên"][i]} <i>Đã mua hàng</i>
                </b>
                <p>{x}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="best related">
          <h2>Có thể mẹ cũng thích</h2>
          <div className="products">
            {products
              .filter((x) => x.id !== p.id)
              .slice(0, 4)
              .map((x) => (
                <Card p={x} key={x.id} />
              ))}
          </div>
        </section>
        {history.length > 1 && (
          <section className="best related">
            <h2>Sản phẩm đã xem</h2>
            <div className="products">
              {history
                .filter((id) => id !== p.id)
                .map((id) => products.find((x) => x.id === id))
                .filter(Boolean)
                .map((x: any) => (
                  <Card p={x} key={x.id} />
                ))}
            </div>
          </section>
        )}
      </main>
    );
  };
  const Drawer = () =>
    drawer && (
      <>
        <button
          className="scrim"
          onClick={() => setDrawer(false)}
          aria-label="Đóng giỏ"
        />
        <aside className="drawer" role="dialog" aria-modal="true">
          <div className="drawer-title">
            <h2>
              Giỏ hàng <span>({count})</span>
            </h2>
            <button className="icon-btn" onClick={() => setDrawer(false)}>
              <Icon name="x" />
            </button>
          </div>
          {cart.length === 0 ? (
            <Empty
              title="Giỏ hàng đang trống"
              copy="Khám phá sản phẩm dành cho mẹ và bé."
              action={() => go("/products")}
            />
          ) : (
            <>
              <div className="drawer-items">
                {cart.map((item, i) => {
                  const p = products.find((x) => x.id === item.productId)!;
                  return (
                    <div
                      className="cart-line"
                      key={`${item.productId}${item.size}`}
                    >
                      <img src={p.images[0]} alt={p.name} />
                      <div>
                        <b>{p.name}</b>
                        <p>
                          {item.color} · Size {item.size}
                        </p>
                        <strong>{formatMoney(p.price)}</strong>
                        <div className="quantity">
                          <button onClick={() => update(i, item.quantity - 1)}>
                            <Icon name="minus" size={14} />
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => update(i, item.quantity + 1)}>
                            <Icon name="plus" size={14} />
                          </button>
                        </div>
                      </div>
                      <button className="remove" onClick={() => update(i, 0)}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="shipping-note">
                <Icon name="truck" />
                <span>
                  {subtotal >= 699000
                    ? "Đơn hàng được miễn phí vận chuyển"
                    : `Mua thêm ${formatMoney(699000 - subtotal)} để miễn phí vận chuyển`}
                </span>
              </div>
              <div className="drawer-foot">
                <div>
                  <span>Tạm tính</span>
                  <strong>{formatMoney(subtotal)}</strong>
                </div>
                <button className="btn secondary" onClick={() => go("/cart")}>
                  Xem giỏ hàng
                </button>
                <button className="btn primary" onClick={() => go("/checkout")}>
                  Thanh toán ngay
                </button>
              </div>
            </>
          )}
        </aside>
      </>
    );
  const Cart = () => <CartPage count={count} cart={cart} products={products} formatMoney={formatMoney} update={update} Icon={Icon} subtotal={subtotal} go={go} Empty={Empty} />;
  const Checkout = () => <CheckoutPage logged={logged} notify={notify} go={go} cart={cart} address={address} setAddress={setAddress} currentUser={currentUser} subtotal={subtotal} formatMoney={formatMoney} Icon={Icon} Empty={Empty} products={products} setCart={setCart} setOrders={setOrders} />;
  const Auth = () => {
    const register = route === "/register",
      forgot = route === "/forgot-password",
      verify = route === "/verify-otp";
    return (
      <main className="auth-page">
        <section className="auth-visual">
          <button className="logo light" onClick={() => go("/")}>
            an an.
          </button>
          <div>
            <p className="kicker">AN AN MEMBERS</p>
            <h1>
              {register ? (
                <>
                  Bắt đầu hành trình
                  <br />
                  cùng An An.
                </>
              ) : verify ? (
                <>
                  Chỉ còn một
                  <br />
                  bước nhỏ.
                </>
              ) : (
                <>
                  Dịu dàng hơn
                  <br />
                  khi có nhau.
                </>
              )}
            </h1>
            <p>
              Lưu địa chỉ, theo dõi đơn hàng và nhận những ưu đãi dành riêng cho
              mẹ.
            </p>
            <ul>
              <li>Quản lý và theo dõi đơn hàng</li>
              <li>Lưu sản phẩm mẹ yêu thích</li>
              <li>Nhận điểm thưởng thành viên</li>
            </ul>
          </div>
        </section>
        <section className="auth-form">
          <button
            className="back-link"
            onClick={() => go(forgot || verify ? "/login" : "/")}
          >
            ← {forgot || verify ? "Quay lại đăng nhập" : "Về trang chủ"}
          </button>
          {register ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                if (data.get("password") !== data.get("confirm")) {
                  notify("Mật khẩu xác nhận chưa trùng khớp");
                  return;
                }
                const res = await api.auth.register({
                  fullName: data.get("fullName") as string,
                  phone: data.get("phone") as string,
                  email: data.get("email") as string,
                  password: data.get("password") as string,
                });
                if (res.success) {
                  notify("Tạo tài khoản thành công! Vui lòng đăng nhập.");
                  go("/login");
                } else {
                  notify(res.error || "Có lỗi xảy ra");
                }
              }}
            >
              <p className="kicker">THÀNH VIÊN MỚI</p>
              <h1>Đăng ký tài khoản</h1>
              <p className="auth-intro">
                Tạo tài khoản miễn phí để trải nghiệm mua sắm thuận tiện hơn.
              </p>
              <div className="auth-grid">
                <label className="full">
                  Họ và tên
                  <input
                    name="fullName"
                    required
                    minLength={2}
                    autoComplete="name"
                    placeholder="Nguyễn Minh Anh"
                  />
                </label>
                <label>
                  Số điện thoại
                  <input
                    name="phone"
                    required
                    type="tel"
                    pattern="(0|\+84)[0-9]{9}"
                    autoComplete="tel"
                    placeholder="0901 234 567"
                  />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="minhanh@email.com"
                  />
                </label>
                <label>
                  Mật khẩu
                  <input
                    name="password"
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                  />
                </label>
                <label>
                  Xác nhận mật khẩu
                  <input
                    name="confirm"
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                  />
                </label>
              </div>
              <label className="auth-terms">
                <input required type="checkbox" /> Tôi đồng ý với{" "}
                <button type="button" onClick={() => go("/policy")}>
                  Điều khoản sử dụng
                </button>{" "}
                và{" "}
                <button type="button" onClick={() => go("/policy")}>
                  Chính sách bảo mật
                </button>
                .
              </label>
              <button className="btn primary">Tạo tài khoản</button>
              <p>
                Đã có tài khoản?{" "}
                <button type="button" onClick={() => go("/login")}>
                  Đăng nhập
                </button>
              </p>
            </form>
          ) : forgot ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                notify("Liên kết khôi phục đã được gửi");
                go("/login");
              }}
            >
              <p className="kicker">KHÔI PHỤC TÀI KHOẢN</p>
              <h1>Quên mật khẩu</h1>
              <p className="auth-intro">
                Nhập email hoặc số điện thoại đã đăng ký. An An sẽ gửi hướng dẫn
                đặt lại mật khẩu.
              </p>
              <label>
                Email hoặc số điện thoại
                <input
                  required
                  autoComplete="username"
                  placeholder="Email hoặc số điện thoại"
                />
              </label>
              <button className="btn primary">Gửi hướng dẫn</button>
            </form>
          ) : verify ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLogged(true);
                notify("Đăng ký tài khoản thành công");
                go("/account");
              }}
            >
              <p className="kicker">XÁC MINH TÀI KHOẢN</p>
              <h1>Nhập mã OTP</h1>
              <p className="auth-intro">
                Mã gồm 6 chữ số đã được gửi tới số điện thoại của mẹ. Mã có hiệu
                lực trong 5 phút.
              </p>
              <label className="otp-label">
                Mã xác minh
                <input
                  className="otp-input"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  placeholder="• • • • • •"
                />
              </label>
              <button className="btn primary">Xác nhận và hoàn tất</button>
              <button
                type="button"
                className="text-link"
                onClick={() => notify("Đã gửi lại mã OTP")}
              >
                Gửi lại mã
              </button>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const res = await api.auth.login({
                  login: data.get("login") as string,
                  password: data.get("password") as string,
                });
                if (res.success) {
                  setLogged(true);
                  setCurrentUser(res.data?.user);
                  notify("Đăng nhập thành công");
                  if (res.data?.user.roles.includes("ADMIN")) go("/admin");
                  else go("/account");
                } else {
                  notify(res.error || "Đăng nhập thất bại");
                }
              }}
            >
              <p className="kicker">CHÀO MẸ QUAY LẠI</p>
              <h1>Đăng nhập</h1>
              <label>
                Email hoặc số điện thoại
                <input
                  name="login"
                  required
                  autoComplete="username"
                  placeholder="Email hoặc số điện thoại"
                />
              </label>
              <label>
                Mật khẩu
                <input
                  name="password"
                  required
                  type="password"
                  minLength={8}
                  autoComplete="current-password"
                  placeholder="Tối thiểu 8 ký tự"
                />
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() => go("/forgot-password")}
              >
                Quên mật khẩu?
              </button>
              <button className="btn primary">Đăng nhập</button>
              <p>
                Chưa có tài khoản?{" "}
                <button type="button" onClick={() => go("/register")}>
                  Đăng ký ngay
                </button>
              </p>
            </form>
          )}
        </section>
      </main>
    );
  };
  const Account = () => {
    if (!logged)
      return (
        <main className="page-wrap">
          <Empty
            title="Mẹ chưa đăng nhập"
            copy="Đăng nhập để quản lý đơn hàng và thông tin."
            action={() => go("/login")}
          />
        </main>
      );
    const code = route.split("/account/orders/")[1],
      order = orders.find((o) => o.code === code),
      tab = route.split("/account/")[1] || "overview";
    let body;
    if (order)
      body = (
        <section className="account-content">
          <button className="back-link" onClick={() => go("/account/orders")}>
            ← Danh sách đơn
          </button>
          <div className="order-heading">
            <div>
              <p className="kicker">ĐƠN HÀNG</p>
              <h1>#{order.code}</h1>
              <span>Đặt ngày {order.createdAt}</span>
            </div>
            <i className={`order-status ${order.status}`}>
              {status[order.status]}
            </i>
          </div>
          <div className="timeline">
            {(
              [
                "pending",
                "processing",
                "shipping",
                "delivered",
              ] as OrderStatus[]
            ).map((s, i) => (
              <div
                className={
                  ["pending", "processing", "shipping", "delivered"].indexOf(
                    order.status,
                  ) >= i
                    ? "done"
                    : ""
                }
                key={s}
              >
                <span>
                  <Icon name="check" />
                </span>
                <b>{status[s]}</b>
              </div>
            ))}
          </div>
          <div className="order-detail-grid">
            <div>
              {order.items.map((item) => {
                const p = products.find((x) => x.id === item.productId)!;
                return (
                  <article className="order-product" key={item.productId}>
                    <img src={p.images[0]} alt="" />
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {item.color} · {item.size} · SL {item.quantity}
                      </small>
                    </span>
                    <strong>{formatMoney(p.price * item.quantity)}</strong>
                  </article>
                );
              })}
            </div>
            <aside>
              <h3>Giao hàng</h3>
              <p>
                {order.customer}
                <br />
                {order.address}
              </p>
              <h3>Thanh toán</h3>
              <p>
                {order.payment} · {order.paymentStatus}
              </p>
              <strong>
                Tổng <b>{formatMoney(order.total)}</b>
              </strong>
            </aside>
          </div>
          {["pending", "processing"].includes(order.status) && (
            <button
              className="btn danger"
              onClick={() =>
                setOrders((x) =>
                  x.map((o) =>
                    o.code === order.code ? { ...o, status: "cancelled" } : o,
                  ),
                )
              }
            >
              Yêu cầu hủy đơn
            </button>
          )}
        </section>
      );
    else if (tab === "orders")
      body = (
        <section className="account-content">
          <p className="kicker">LỊCH SỬ MUA HÀNG</p>
          <h1>Đơn hàng của mẹ</h1>
          <div className="order-list">
            {orders.map((o) => (
              <button
                onClick={() => go(`/account/orders/${o.code}`)}
                key={o.code}
              >
                <span>
                  <b>#{o.code}</b>
                  <small>
                    {o.createdAt} · {o.items.length} sản phẩm
                  </small>
                </span>
                <strong>{formatMoney(o.total)}</strong>
                <i className={`order-status ${o.status}`}>{status[o.status]}</i>
                <span>→</span>
              </button>
            ))}
          </div>
        </section>
      );
    else if (tab === "wishlist")
      body = (
        <section className="account-content">
          <p className="kicker">ĐÃ LƯU</p>
          <h1>Sản phẩm yêu thích</h1>
          <div className="product-grid account-products">
            {products
              .filter((p) => wish.includes(p.id))
              .map((p) => (
                <Card p={p} key={p.id} />
              ))}
          </div>
        </section>
      );
    else if (tab === "addresses")
      body = (
        <section className="account-content">
          <p className="kicker">SỔ ĐỊA CHỈ</p>
          <h1>Địa chỉ của mẹ</h1>
          <article className="address-card">
            <Icon name="location" />
            <div>
              <b>
                {address.fullName} <i>Mặc định</i>
              </b>
              <p>
                {address.phone}
                <br />
                {address.line1}, {address.ward}, {address.district},{" "}
                {address.province}
              </p>
              <button onClick={() => notify("Đã mở chỉnh sửa địa chỉ")}>
                Chỉnh sửa
              </button>
            </div>
          </article>
        </section>
      );
    else if (tab === "coupons")
      body = (
        <section className="account-content">
          <p className="kicker">ƯU ĐÃI</p>
          <h1>Mã giảm giá của mẹ</h1>
          <div className="coupon-grid">
            {[
              ["ANAN10", "Giảm 10%"],
              ["FREESHIP", "Miễn phí vận chuyển"],
            ].map((x) => (
              <article key={x[0]}>
                <div>
                  <b>{x[1]}</b>
                  <p>Áp dụng đến 30/09/2026</p>
                </div>
                <button onClick={() => notify(`Đã sao chép ${x[0]}`)}>
                  {x[0]}
                </button>
              </article>
            ))}
          </div>
        </section>
      );
    else
      body = (
        <section className="account-content">
          <p className="kicker">AN AN MEMBERS</p>
          <h1>Chào mẹ, {currentUser?.fullName?.split(" ").pop()}</h1>
          <p className="account-intro">
            Cùng theo dõi những điều nhỏ xinh trong hành trình của mẹ và bé.
          </p>
          <div className="account-stats">
            <button onClick={() => go("/account/orders")}>
              <Icon name="package" />
              <b>{orders.length} đơn hàng</b>
              <span>Xem lịch sử →</span>
            </button>
            <button onClick={() => go("/account/wishlist")}>
              <Icon name="heart" />
              <b>{wish.length} sản phẩm đã lưu</b>
              <span>Xem yêu thích →</span>
            </button>
            <button onClick={() => go("/account/coupons")}>
              <b>AN AN MEMBER</b>
              <strong>120 điểm</strong>
              <span>Xem ưu đãi →</span>
            </button>
          </div>
        </section>
      );
    return (
      <main className="account-layout page-wrap">
        <aside className="account-sidebar">
          <div>
            <span>{currentUser?.fullName?.charAt(0).toUpperCase()}</span>
            <b>{currentUser?.fullName}</b>
            <small>{currentUser?.email}</small>
          </div>
          {[
            ["overview", "Tổng quan"],
            ["orders", "Đơn hàng"],
            ["addresses", "Địa chỉ"],
            ["wishlist", "Yêu thích"],
            ["coupons", "Mã giảm giá"],
          ].map((x) => (
            <button
              className={tab === x[0] ? "active" : ""}
              onClick={() =>
                go(x[0] === "overview" ? "/account" : `/account/${x[0]}`)
              }
              key={x[0]}
            >
              {x[1]}
            </button>
          ))}
          <button
            onClick={() => {
              api.auth.logout().then(() => {
                setLogged(false);
                setCurrentUser(null);
                go("/");
              });
            }}
          >
            Đăng xuất
          </button>
        </aside>
        {body}
      </main>
    );
  };
  const Admin = () => {
    if (!logged || !currentUser?.roles?.includes("ADMIN"))
      return (
        <main className="page-wrap">
          <Empty
            title="Không có quyền truy cập"
            copy="Vui lòng đăng nhập bằng tài khoản quản trị viên."
            action={() => go("/login")}
          />
        </main>
      );
    const tab = route.split("/admin/")[1]?.split("/")[0] || adminTab,
      setTab = (x: string) => {
        setAdminTab(x);
        go(x === "overview" ? "/admin" : `/admin/${x}`);
      },
      labels: Record<string, string> = {
        overview: "Tổng quan",
        orders: "Đơn hàng",
        products: "Sản phẩm",
        categories: "Danh mục",
        inventory: "Tồn kho",
        customers: "Khách hàng",
        promotions: "Khuyến mãi",
        reviews: "Đánh giá",
        content: "Nội dung",
        reports: "Báo cáo",
        staff: "Nhân viên",
        settings: "Cài đặt",
      };
    const rows: Record<string, string[][]> = {
      products: products.map((p) => [
        p.name,
        p.categoryLabel,
        formatMoney(p.price),
        String(p.sizes.reduce((s, x) => s + x.stock, 0)),
        "Đang bán",
      ]),
      inventory: products.map((p) => [
        p.name,
        p.sizes.map((s) => s.name).join(", "),
        String(p.sizes.reduce((s, x) => s + x.stock, 0)),
        "Còn hàng",
      ]),
      customers: [
        ["Nguyễn Minh Anh", "0901 234 567", "8 đơn", "4.820.000₫"],
        ["Lê Thu Trang", "0987 654 321", "5 đơn", "2.490.000₫"],
      ],
      promotions: [
        ["ANAN10", "Giảm 10%", "42/200", "Hoạt động"],
        ["FREESHIP", "Miễn phí ship", "78/300", "Hoạt động"],
      ],
      categories: Object.entries(categoryLabels).map((x) => [
        x[1],
        x[0],
        String(products.filter((p) => p.category === x[0]).length),
        "Hiển thị",
      ]),
      reviews: [
        ["Minh Anh", products[0].name, "5/5", "Đã duyệt"],
        ["Thu Trang", products[2].name, "5/5", "Chờ duyệt"],
      ],
      content: [
        ["Chọn size đồ bầu", "Bài viết", "28/08/2026", "Đã đăng"],
        ["Hero Thu dịu dàng", "Banner", "27/08/2026", "Hiển thị"],
      ],
      staff: [
        ["An An Admin", "Chủ cửa hàng", "admin@ananshop.vn", "Hoạt động"],
        ["Thu Nguyễn", "Xử lý đơn", "thu@ananshop.vn", "Hoạt động"],
      ],
    };
    let body;
    if (tab === "overview")
      body = (
        <>
          <div className="admin-top">
            <div>
              <p className="eyebrow">28 THÁNG 8, 2026</p>
              <h1>Chào buổi sáng, An An</h1>
            </div>
            <button className="btn primary" onClick={() => setTab("products")}>
              + Tạo sản phẩm
            </button>
          </div>
          <section className="stats">
            {[
              ["Doanh thu", "48.560.000₫"],
              ["Đơn hàng", "126"],
              ["Giá trị đơn TB", "385.000₫"],
              ["Khách hàng mới", "42"],
            ].map((x) => (
              <div key={x[0]}>
                <span>
                  {x[0]} <em>+12%</em>
                </span>
                <b>{x[1]}</b>
                <small>so với tuần trước</small>
              </div>
            ))}
          </section>
          <section className="dashboard-grid">
            <div className="chart">
              <h2>Doanh thu</h2>
              <div className="chart-bars">
                {[45, 70, 55, 85, 67, 92, 76].map((h, i) => (
                  <span style={{ height: h + "%" }} key={i}>
                    <i />
                  </span>
                ))}
              </div>
            </div>
            <div className="status-card">
              <h2>Trạng thái đơn</h2>
              {Object.entries(status)
                .slice(0, 4)
                .map((x) => (
                  <div key={x[0]}>
                    <span>{x[1]}</span>
                    <b>{12 + orders.filter((o) => o.status === x[0]).length}</b>
                  </div>
                ))}
            </div>
          </section>
        </>
      );
    else if (tab === "orders")
      body = (
        <AdminTable
          title="Đơn hàng"
          headers={["Mã đơn", "Khách hàng", "Tổng", "Thanh toán", "Trạng thái"]}
          rows={orders.map((o) => [
            `#${o.code}`,
            o.customer,
            formatMoney(o.total),
            o.paymentStatus,
            status[o.status],
          ])}
        />
      );
    else if (tab === "reports")
      body = (
        <div className="admin-page">
          <h1>Báo cáo</h1>
          <section className="report-grid">
            <article>
              <h2>Doanh thu theo danh mục</h2>
              {Object.values(categoryLabels).map((x, i) => (
                <div key={x}>
                  <span>{x}</span>
                  <i>
                    <b style={{ width: `${85 - i * 12}%` }} />
                  </i>
                  <strong>{[38, 24, 19, 11, 8][i]}%</strong>
                </div>
              ))}
            </article>
            <article>
              <h2>Hiệu suất</h2>
              <strong>3,8%</strong>
              <p>Tỷ lệ chuyển đổi</p>
              <strong>28%</strong>
              <p>Khách hàng quay lại</p>
            </article>
          </section>
        </div>
      );
    else if (tab === "settings")
      body = (
        <div className="admin-page">
          <div className="admin-heading">
            <h1>Cài đặt cửa hàng</h1>
            <button
              className="btn primary"
              onClick={() => notify("Đã lưu cài đặt")}
            >
              Lưu
            </button>
          </div>
          <section className="settings-form">
            <label>
              Tên cửa hàng
              <input defaultValue="An An Shop" />
            </label>
            <label>
              Email
              <input defaultValue="hello@ananshop.vn" />
            </label>
            <label>
              Hotline
              <input defaultValue="1900 6868" />
            </label>
            <label>
              Địa chỉ
              <textarea defaultValue="18 Võ Văn Tần, Quận 3, TP.HCM" />
            </label>
          </section>
        </div>
      );
    else
      body = (
        <AdminTable
          title={labels[tab]}
          headers={
            tab === "products"
              ? ["Sản phẩm", "Danh mục", "Giá", "Tồn", "Trạng thái"]
              : ["Tên", "Thông tin", "Số liệu", "Trạng thái"]
          }
          rows={rows[tab] || []}
        />
      );
    return (
      <div className="admin">
        <aside>
          <button className="logo" onClick={() => go("/")}>
            an an. <small>ADMIN</small>
          </button>
          {Object.entries(labels).map((x) => (
            <button
              className={tab === x[0] ? "active" : ""}
              onClick={() => setTab(x[0])}
              key={x[0]}
            >
              {x[1]}
            </button>
          ))}
          <button
            onClick={() => {
              api.auth.logout().then(() => {
                setLogged(false);
                setCurrentUser(null);
                go("/");
              });
            }}
          >
            Đăng xuất
          </button>
        </aside>
        <div className="admin-mobile-nav">
          <select value={tab} onChange={(e) => setTab(e.target.value)}>
            {Object.entries(labels).map((x) => (
              <option value={x[0]} key={x[0]}>
                {x[1]}
              </option>
            ))}
          </select>
        </div>
        <main>{body}</main>
      </div>
    );
  };
  const Content = () => {
    const pages: Record<string, [string, string, string[]]> = {
      "/about": [
        "CÂU CHUYỆN AN AN",
        "Dịu dàng bắt đầu từ sự thấu hiểu.",
        [
          "An An được tạo nên để mỗi người mẹ cảm thấy thoải mái và được lắng nghe.",
          "Từ chất liệu đến đường may, chúng mình ưu tiên sự an toàn và bền vững.",
        ],
      ],
      "/size-guide": [
        "HƯỚNG DẪN CHỌN SIZE",
        "Chọn vừa vặn, mẹ luôn thoải mái.",
        [
          "Đồ bầu: S 40–50kg · M 48–58kg · L 56–67kg · XL 65–78kg.",
          "Đồ bé: 0–3M dưới 5,5kg · 3–6M 5–7,5kg · 6–9M 7–9kg.",
        ],
      ],
      "/faq": [
        "HỖ TRỢ",
        "Câu hỏi thường gặp",
        [
          "Đổi size trong 14 ngày nếu sản phẩm còn nguyên tem và chưa giặt.",
          "Giao nội thành 1–2 ngày, các tỉnh 2–5 ngày làm việc.",
        ],
      ],
      "/policy": [
        "CHÍNH SÁCH",
        "Vận chuyển, đổi trả và bảo mật",
        [
          "Miễn phí vận chuyển tiêu chuẩn từ 699.000₫.",
          "Thông tin cá nhân chỉ được dùng để xử lý đơn và hỗ trợ khách hàng.",
        ],
      ],
      "/contact": [
        "AN AN LUÔN Ở ĐÂY",
        "Liên hệ với chúng mình",
        [
          "Hotline 1900 6868 · hello@ananshop.vn · 08:30–21:00.",
          "Cửa hàng: 18 Võ Văn Tần, Quận 3, TP.HCM.",
        ],
      ],
      "/journal": [
        "CẨM NANG",
        "Cùng mẹ chăm điều bé nhỏ",
        [
          "Chọn size đồ bầu theo từng tam cá nguyệt.",
          "Chuẩn bị tủ đồ sơ sinh vừa đủ và an toàn.",
        ],
      ],
    };
    const p = pages[route] || pages["/about"];
    return (
      <main className="content-page">
        <div className="content-hero">
          <p className="kicker">{p[0]}</p>
          <h1>{p[1]}</h1>
        </div>
        <div className="content-sections">
          {p[2].map((x, i) => (
            <section key={x}>
              <span>0{i + 1}</span>
              <div>
                <h2>{i ? "Thông tin cần biết" : "An An chia sẻ"}</h2>
                <p>{x}</p>
              </div>
            </section>
          ))}
        </div>
      </main>
    );
  };
  const slug = route.split("/product/")[1];
  const product = products.find((p) => p.slug === slug);
  const success = route.split("/success/")[1];
  const admin = route.startsWith("/admin");
  const authRoutes = ["/login", "/register", "/forgot-password", "/verify-otp"];

  useEffect(() => {
    if (product) {
      setHistory((h) => {
        const nh = h.filter((id) => id !== product.id);
        return [product.id, ...nh].slice(0, 5);
      });
    }
  }, [product?.id]);
  let page: React.ReactNode;
  if (route === "/") page = <Home />;
  else if (route === "/products" || route === "/promotions") page = <Listing />;
  else if (route === "/search") page = <Listing search />;
  else if (product) page = <Detail p={product} />;
  else if (route === "/cart") page = <Cart />;
  else if (route === "/checkout") page = <Checkout />;
  else if (success)
    page = (
      <main className="success-page">
        <div className="success-mark">
          <Icon name="check" size={42} />
        </div>
        <p className="kicker">ĐƠN HÀNG ĐÃ ĐƯỢC GHI NHẬN</p>
        <h1>Cảm ơn mẹ đã tin chọn An An.</h1>
        <p>
          Đơn <b>#{success}</b> đang chờ xác nhận.
        </p>
        <div className="success-actions">
          <button
            className="btn primary"
            onClick={() => {
              setLogged(true);
              go(`/account/orders/${success}`);
            }}
          >
            Theo dõi đơn hàng
          </button>
          <button className="btn secondary" onClick={() => go("/products")}>
            Tiếp tục mua
          </button>
        </div>
      </main>
    );
  else if (authRoutes.includes(route)) page = <Auth />;
  else if (route.startsWith("/account")) page = <Account />;
  else if (admin) page = <AdminPage currentUser={currentUser} logged={logged} go={go} />;
  else if (
    [
      "/about",
      "/size-guide",
      "/faq",
      "/policy",
      "/contact",
      "/journal",
    ].includes(route)
  )
    page = <Content />;
  else
    page = (
      <main className="not-found">
        <p className="kicker">404</p>
        <h1>Trang mẹ tìm chưa có.</h1>
        <button className="btn primary" onClick={() => go("/")}>
          Về trang chủ
        </button>
      </main>
    );
  return (
    <div className="app">
      {!admin && route !== "/checkout" && !authRoutes.includes(route) && (
        <Header />
      )}
      {page}
      {!admin &&
        route !== "/checkout" &&
        !authRoutes.includes(route) &&
        !success && <Footer />}
      <Drawer />
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  );
}

function AdminTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  const [q, setQ] = useState("");
  const shown = rows.filter((r) =>
    r.join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="admin-page">
      <div className="admin-heading">
        <h1>{title}</h1>
        <button className="btn primary">+ Tạo mới</button>
      </div>
      <div className="admin-toolbar">
        <Icon name="search" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Tìm ${title.toLowerCase()}...`}
        />
        <button>
          <Icon name="filter" /> Bộ lọc
        </button>
      </div>
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {r.map((c, n) => (
                  <td key={n}>
                    {n === r.length - 1 ? (
                      <span className="status">{c}</span>
                    ) : (
                      c
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
