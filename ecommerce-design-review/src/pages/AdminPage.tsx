import React, { useState, useEffect } from "react";
import { api } from "../api";
import { formatMoney } from "../data";

const AdminPage = ({ currentUser, logged, go }: any) => {
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (logged && currentUser?.roles?.includes("ADMIN")) {
      api.catalog.products().then(res => setProducts(res.data || []));
    }
  }, [logged, currentUser]);

  if (!logged || !currentUser?.roles?.includes("ADMIN")) {
    return (
      <main className="page-wrap">
        <div className="empty-state">
          <h2>Không có quyền truy cập</h2>
          <p>Vui lòng đăng nhập bằng tài khoản quản trị viên.</p>
          <button className="btn primary" onClick={() => go("/login")}>Khám phá sản phẩm</button>
        </div>
      </main>
    );
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const data = {
      name: fd.get("name"),
      category: fd.get("category"),
      description: fd.get("description"),
      price: Number(fd.get("price")),
    };
    
    // In a real app we'd call api.catalog.createProduct(data)
    // For now, we mock the UI update
    setProducts([{ id: Date.now(), ...data, sizes: [], images: [], badge: "Mới" }, ...products]);
    setShowAddModal(false);
    alert("Thêm sản phẩm thành công!");
  };

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">an an. <span>Admin</span></div>
        <nav>
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Tổng quan</button>
          <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Sản phẩm</button>
          <button onClick={() => go("/")}>Về trang chủ</button>
        </nav>
      </aside>
      
      <div className="admin-content">
        {tab === "overview" && (
          <div className="admin-page">
            <div className="admin-heading">
              <h1>Tổng quan Hệ thống</h1>
            </div>
            <p>Chào mừng Admin quay trở lại!</p>
          </div>
        )}

        {tab === "products" && (
          <div className="admin-page">
            <div className="admin-heading">
              <h1>Quản lý Sản phẩm</h1>
              <button className="btn primary" onClick={() => setShowAddModal(true)}>+ Tạo sản phẩm mới</button>
            </div>
            
            <div className="admin-table">
              <table>
                <thead>
                  <tr><th>Tên Sản Phẩm</th><th>Danh mục</th><th>Giá</th><th>Trạng thái</th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category || p.categoryLabel}</td>
                      <td>{formatMoney(p.price || 0)}</td>
                      <td><span className="status">Đang bán</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Thêm Sản Phẩm Mới</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="field">
                <label>Tên sản phẩm</label>
                <input name="name" required />
              </div>
              <div className="field">
                <label>Danh mục</label>
                <select name="category">
                  <option value="maternity">Đồ bầu</option>
                  <option value="postpartum">Sau sinh</option>
                  <option value="newborn">Sơ sinh</option>
                </select>
              </div>
              <div className="field">
                <label>Giá bán (VND)</label>
                <input name="price" type="number" required />
              </div>
              <div className="field">
                <label>Mô tả ngắn</label>
                <textarea name="description" rows={3}></textarea>
              </div>
              <button type="submit" className="btn primary">Lưu sản phẩm</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default AdminPage;
