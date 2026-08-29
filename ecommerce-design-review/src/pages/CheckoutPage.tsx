import React, { useState } from "react";
import type { Product } from "../types";

export default function CheckoutPage({ logged, notify, go, cart, address, setAddress, currentUser, subtotal, formatMoney, Icon, Empty, products, setCart, setOrders }: any) {
  const [step, setStep] = useState(1);
  const [pay, setPay] = useState("cod");
  const [ship, setShip] = useState("ghtk");
  const [terms, setTerms] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  
  const shipping = ship === "ghtk" ? 30000 : 50000;
  const total = subtotal - discount + shipping;
  
    if (!logged) {
      notify("Vui lòng đăng nhập để thanh toán");
      go("/login");
      return (
        <main className="page-wrap">
          <Empty
            title="Mẹ chưa đăng nhập"
            copy="Đăng nhập để thanh toán đơn hàng."
            action={() => go("/login")}
          />
        </main>
      );
    }
    const valid =
      address.fullName.trim().length > 1 &&
      /^(0|\+84)\d{9}$/.test(address.phone.replace(/\s/g, "")) &&
      address.line1.length > 4;
    const field = (
      key:
        | "fullName"
        | "phone"
        | "email"
        | "province"
        | "district"
        | "ward"
        | "line1",
      label: string,
    ) => (
      <label className={key === "line1" || key === "email" ? "full" : ""}>
        {label}
        <input
          value={address[key]}
          onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
          required={key !== "email"}
        />
      </label>
    );
    const place = () => {
      const code = `AN${Date.now().toString().slice(-8)}`;
      const order: any = {
          code,
          createdAt: new Date().toLocaleDateString("vi-VN"),
          status: "pending",
          paymentStatus: pay === "cod" ? "unpaid" : "paid",
          items: [...cart],
          total,
          customer: address.fullName,
          address: `${address.line1}, ${address.ward}, ${address.district}, ${address.province}`,
          payment: pay === "cod" ? "COD" : pay.toUpperCase(),
          shipping: ship === "express" ? "Giao nhanh" : "Giao tiêu chuẩn",
        };
      setOrders((prev: any) => [order, ...prev]);
      setCart([]);
      setStep(1);
      go(`/success/${code}`);
    };
    if (!cart.length)
      return (
        <main className="checkout-empty">
          <Empty
            title="Chưa có sản phẩm để thanh toán"
            copy="Hãy thêm sản phẩm vào giỏ."
            action={() => go("/products")}
          />
        </main>
      );
    return (
      <main className="checkout page-wrap">
        <div className="checkout-title">
          <button className="logo" onClick={() => go("/")}>
            an an.
          </button>
          <span>🔒 Thanh toán an toàn</span>
        </div>
        <div className="checkout-grid">
          <section className="checkout-form">
            <div className="steps">
              {["Thông tin", "Vận chuyển", "Xác nhận"].map((x, i) => (
                <span className={step >= i + 1 ? "on" : ""} key={x}>
                  {i + 1} <b>{x}</b>
                </span>
              ))}
            </div>
            {step === 1 && (
              <>
                <h1>Thông tin nhận hàng</h1>
                <div className="form-grid">
                  {field("fullName", "Họ và tên")}
                  {field("phone", "Số điện thoại")}
                  {field("email", "Email (không bắt buộc)")}
                  {field("province", "Tỉnh / Thành phố")}
                  {field("district", "Quận / Huyện")}
                  {field("ward", "Phường / Xã")}
                  {field("line1", "Địa chỉ chi tiết")}
                </div>
                {!valid && (
                  <p className="field-help">
                    Vui lòng nhập đầy đủ họ tên, số điện thoại 10 số và địa chỉ.
                  </p>
                )}
                <button
                  disabled={!valid}
                  className="btn primary form-next"
                  onClick={() => setStep(2)}
                >
                  Tiếp tục đến vận chuyển
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <button className="back-link" onClick={() => setStep(1)}>
                  ← Quay lại
                </button>
                <h1>Vận chuyển & thanh toán</h1>
                <h3>Phương thức giao hàng</h3>
                {[
                  ["standard", "Giao hàng tiêu chuẩn", "2–4 ngày", 30000],
                  ["express", "Giao hàng nhanh", "1–2 ngày", 45000],
                ].map((x) => (
                  <label
                    className={`method ${ship === x[0] ? "selected" : ""}`}
                    key={String(x[0])}
                  >
                    <input
                      type="radio"
                      checked={ship === x[0]}
                      onChange={() => setShip(x[0] as typeof ship)}
                    />
                    <span>
                      <b>{x[1]}</b>
                      <small>{x[2]}</small>
                    </span>
                    <strong>{formatMoney(Number(x[3]))}</strong>
                  </label>
                ))}
                <h3>Phương thức thanh toán</h3>
                {[
                  ["cod", "Thanh toán khi nhận hàng"],
                  ["momo", "Ví MoMo"],
                  ["vnpay", "VNPay / QR ngân hàng"],
                  ["card", "Visa / Mastercard"],
                ].map((x) => (
                  <label
                    className={`method ${pay === x[0] ? "selected" : ""}`}
                    key={x[0]}
                  >
                    <input
                      type="radio"
                      checked={pay === x[0]}
                      onChange={() => setPay(x[0])}
                    />
                    <span>
                      <b>{x[1]}</b>
                      <small>Thanh toán an toàn và bảo mật</small>
                    </span>
                  </label>
                ))}
                <button
                  className="btn primary form-next"
                  onClick={() => setStep(3)}
                >
                  Kiểm tra đơn hàng
                </button>
              </>
            )}
            {step === 3 && (
              <>
                <button className="back-link" onClick={() => setStep(2)}>
                  ← Quay lại
                </button>
                <h1>Xác nhận đơn hàng</h1>
                <div className="review-card">
                  <b>Giao đến</b>
                  <p>
                    {address.fullName} · {address.phone}
                    <br />
                    {address.line1}, {address.ward}, {address.district},{" "}
                    {address.province}
                  </p>
                  <button onClick={() => setStep(1)}>Chỉnh sửa</button>
                </div>
                <div className="review-card">
                  <b>Thanh toán</b>
                  <p>
                    {pay.toUpperCase()} ·{" "}
                    {ship === "express" ? "Giao nhanh" : "Giao tiêu chuẩn"}
                  </p>
                  <button onClick={() => setStep(2)}>Chỉnh sửa</button>
                </div>
                <label className="terms">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                  />{" "}
                  Tôi đồng ý điều khoản và chính sách bảo mật.
                </label>
                <button
                  disabled={!terms}
                  className="btn primary form-next"
                  onClick={place}
                >
                  Đặt hàng · {formatMoney(total)}
                </button>
              </>
            )}
          </section>
          <aside className="order-summary">
            <h3>Đơn hàng của mẹ</h3>
            {cart.map((i: any) => {
              const p = products.find((x: any) => x.id === i.productId)!;
              return (
                <div className="summary-product" key={i.productId}>
                  <img src={p.images[0]} alt="" />
                  <span>
                    {p.name}
                    <br />
                    <small>
                      {i.color} · {i.size} · SL {i.quantity}
                    </small>
                  </span>
                  <b>{formatMoney(p.price * i.quantity)}</b>
                </div>
              );
            })}
            <div className="coupon">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                placeholder="Mã giảm giá"
              />
              <button
                onClick={() =>
                  coupon === "ANAN10"
                    ? (setDiscount(Math.round(subtotal * 0.1)),
                      notify("Đã áp dụng ANAN10"))
                    : notify("Mã chưa hợp lệ")
                }
              >
                Áp dụng
              </button>
            </div>
            <div className="total-lines">
              <span>
                Tạm tính <b>{formatMoney(subtotal)}</b>
              </span>
              <span>
                Vận chuyển <b>{formatMoney(shipping)}</b>
              </span>
              <span>
                Giảm giá <b>-{formatMoney(discount)}</b>
              </span>
              <strong>
                Tổng cộng <b>{formatMoney(total)}</b>
              </strong>
            </div>
          </aside>
        </div>
      </main>
    );
  
}