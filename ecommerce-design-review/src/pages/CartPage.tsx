import type { Product } from "../types";

export default function CartPage({ count, cart, products, formatMoney, update, Icon, subtotal, go, Empty }: any) {
  return (

    <main className="page-wrap cart-page">
      <div className="page-title">
        <h1>Giỏ hàng</h1>
        <span>{count} sản phẩm</span>
      </div>
      {!cart.length ? (
        <Empty
          title="Giỏ hàng đang trống"
          copy="Mẹ chưa thêm sản phẩm nào."
          action={() => go("/products")}
        />
      ) : (
        <div className="cart-layout">
          <section>
            {cart.map((item: any, i: number) => {
              const p = products.find((x: any) => x.id === item.productId)!;
              return (
                <article
                  className="cart-page-item"
                  key={`${item.productId}${item.size}`}
                >
                  <img src={p.images[0]} alt={p.name} />
                  <div>
                    <button onClick={() => go(`/product/${p.slug}`)}>
                      {p.name}
                    </button>
                    <p>
                      {item.color} · Size {item.size}
                    </p>
                    <strong>{formatMoney(p.price)}</strong>
                    <div className="quantity">
                      <button onClick={() => update(i, item.quantity - 1)}>
                        <Icon name="minus" />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => update(i, item.quantity + 1)}>
                        <Icon name="plus" />
                      </button>
                    </div>
                  </div>
                  <b>{formatMoney(p.price * item.quantity)}</b>
                  <button className="remove" onClick={() => update(i, 0)}>
                    <Icon name="trash" />
                  </button>
                </article>
              );
            })}
          </section>
          <aside className="cart-summary">
            <h2>Tóm tắt đơn hàng</h2>
            <span>
              Tạm tính <b>{formatMoney(subtotal)}</b>
            </span>
            <span>
              Vận chuyển <b>Tính ở bước sau</b>
            </span>
            <hr />
            <strong>
              Tổng <b>{formatMoney(subtotal)}</b>
            </strong>
            <button className="btn primary" onClick={() => go("/checkout")}>
              Tiến hành thanh toán
            </button>
            <button className="btn secondary" onClick={() => go("/products")}>
              Tiếp tục mua sắm
            </button>
          </aside>
        </div>
      )}
    </main>
  
  );
}