export type AdminRow = {
  id: string;
  cells: string[];
  status: string;
  detail: Array<[string, string]>;
};

export type AdminResource = {
  title: string;
  description: string;
  createLabel?: string;
  headers: string[];
  rows: AdminRow[];
  statuses: string[];
};

const row = (id: string, cells: string[], status: string, detail: Array<[string, string]>): AdminRow => ({ id, cells, status, detail });

export const adminResources: Record<string, AdminResource> = {
  orders: {
    title: "Đơn hàng",
    description: "Theo dõi thanh toán, giao vận, hủy và đổi trả.",
    headers: ["Mã đơn", "Khách hàng", "Ngày đặt", "Tổng tiền", "Thanh toán"],
    statuses: ["Chờ xác nhận", "Đang xử lý", "Đang giao", "Hoàn tất", "Đã hủy"],
    rows: [
      row("AN26082801", ["#AN26082801", "Nguyễn Minh Anh", "28/08/2026", "1.268.000 ₫", "COD"], "Chờ xác nhận", [["Người nhận", "Nguyễn Minh Anh · 0901 234 567"], ["Giao hàng", "18 Võ Văn Tần, Quận 3, TP.HCM"], ["Sản phẩm", "2 sản phẩm · 3 đơn vị"], ["Thanh toán", "COD · Chưa thanh toán"]]),
      row("AN26082718", ["#AN26082718", "Lê Thu Trang", "27/08/2026", "699.000 ₫", "VNPay"], "Đang giao", [["Mã vận đơn", "GHN-942081"], ["Thanh toán", "VNPay · Đã thanh toán"], ["Cập nhật", "Đã bàn giao cho GHN"]]),
      row("AN26082609", ["#AN26082609", "Trần Ngọc Mai", "26/08/2026", "428.000 ₫", "MoMo"], "Hoàn tất", [["Thanh toán", "MoMo · Đã thanh toán"], ["Giao hàng", "Đã giao 27/08/2026"]]),
    ],
  },
  products: {
    title: "Sản phẩm & biến thể",
    description: "Quản lý nội dung, ảnh, giá, SKU và trạng thái bán.",
    createLabel: "Thêm sản phẩm",
    headers: ["Sản phẩm", "Danh mục", "SKU đại diện", "Giá", "Tồn khả dụng"],
    statuses: ["Đang bán", "Bản nháp", "Đã lưu trữ"],
    rows: [
      row("ao-bau-linen", ["Đầm bầu linen An Nhiên", "Thời trang mẹ bầu", "AN-LIN-S-BE", "629.000 ₫", "18"], "Đang bán", [["Biến thể", "6 biến thể · S/M/L · Be/Hồng"], ["Chất liệu", "Linen pha cotton"], ["SEO", "/products/dam-bau-linen-an-nhien"]]),
      row("body-so-sinh", ["Body sơ sinh Mây Nhỏ", "Đồ sơ sinh", "AN-BOD-03M", "219.000 ₫", "6"], "Đang bán", [["Biến thể", "4 biến thể · 0–3M/3–6M"], ["Cảnh báo tồn", "2 SKU dưới ngưỡng"]]),
      row("goi-ngu", ["Gối ngủ nâng đỡ", "Đồ dùng cho mẹ", "AN-PIL-001", "489.000 ₫", "0"], "Bản nháp", [["Biến thể", "1 biến thể"], ["Xuất bản", "Chưa lên lịch"]]),
    ],
  },
  categories: {
    title: "Danh mục & thuộc tính",
    description: "Sắp xếp cây danh mục và bộ lọc theo hành trình mẹ và bé.",
    createLabel: "Thêm danh mục",
    headers: ["Danh mục", "Danh mục cha", "Slug", "Sản phẩm", "Vị trí"],
    statuses: ["Hiển thị", "Ẩn"],
    rows: [
      row("maternity", ["Thời trang mẹ bầu", "—", "thoi-trang-me-bau", "24", "1"], "Hiển thị", [["Thuộc tính", "Tam cá nguyệt, chất liệu, màu sắc"], ["Ảnh đại diện", "Đã thiết lập"]]),
      row("newborn", ["Đồ sơ sinh", "Mẹ & bé", "do-so-sinh", "31", "2"], "Hiển thị", [["Thuộc tính", "Độ tuổi, cân nặng, chất liệu"]]),
      row("postpartum", ["Sau sinh", "Thời trang mẹ bầu", "sau-sinh", "8", "3"], "Ẩn", [["Lý do", "Đang chuẩn bị nội dung"]]),
    ],
  },
  inventory: {
    title: "Tồn kho",
    description: "Theo dõi tồn thực, lượng giữ chỗ và lịch sử điều chỉnh theo SKU.",
    createLabel: "Điều chỉnh tồn",
    headers: ["SKU", "Sản phẩm / biến thể", "Tồn thực", "Giữ chỗ", "Khả dụng"],
    statuses: ["Bình thường", "Sắp hết", "Hết hàng"],
    rows: [
      row("AN-LIN-S-BE", ["AN-LIN-S-BE", "Đầm linen · S / Be", "12", "2", "10"], "Bình thường", [["Ngưỡng cảnh báo", "5"], ["Lần nhập gần nhất", "+20 · PO-240826"], ["Cập nhật", "28/08/2026 08:42"]]),
      row("AN-BOD-03M", ["AN-BOD-03M", "Body Mây Nhỏ · 0–3M", "5", "3", "2"], "Sắp hết", [["Ngưỡng cảnh báo", "5"], ["Giữ chỗ", "3 đơn · hết hạn trong 12 phút"]]),
      row("AN-PIL-001", ["AN-PIL-001", "Gối ngủ nâng đỡ", "0", "0", "0"], "Hết hàng", [["Ngưỡng cảnh báo", "3"], ["Đề xuất", "Tạo phiếu nhập hàng"]]),
    ],
  },
  customers: {
    title: "Khách hàng",
    description: "Hồ sơ, lịch sử mua và trạng thái tài khoản.",
    headers: ["Khách hàng", "Liên hệ", "Đơn hàng", "Chi tiêu", "Lần mua cuối"],
    statuses: ["Hoạt động", "Chờ xác minh", "Đã khóa"],
    rows: [
      row("customer-1", ["Nguyễn Minh Anh", "minhanh@email.com", "8", "4.820.000 ₫", "28/08/2026"], "Hoạt động", [["Điện thoại", "0901 234 567"], ["Địa chỉ", "2 địa chỉ đã lưu"], ["Phân nhóm", "Khách hàng thân thiết"]]),
      row("customer-2", ["Lê Thu Trang", "thutrang@email.com", "5", "2.490.000 ₫", "27/08/2026"], "Hoạt động", [["Điện thoại", "0987 654 321"], ["Đánh giá", "3 đánh giá đã duyệt"]]),
      row("customer-3", ["Phạm Hà", "phamha@email.com", "0", "0 ₫", "—"], "Chờ xác minh", [["Đăng ký", "28/08/2026"], ["Xác minh", "Email chưa xác minh"]]),
    ],
  },
  promotions: {
    title: "Khuyến mãi",
    description: "Thiết lập voucher theo đơn hàng, sản phẩm hoặc danh mục.",
    createLabel: "Tạo khuyến mãi",
    headers: ["Mã", "Loại", "Phạm vi", "Đã dùng", "Thời hạn"],
    statuses: ["Đang chạy", "Đã lên lịch", "Đã kết thúc", "Tạm dừng"],
    rows: [
      row("ANAN10", ["ANAN10", "Giảm 10%", "Toàn đơn", "42 / 200", "30/09/2026"], "Đang chạy", [["Đơn tối thiểu", "499.000 ₫"], ["Giảm tối đa", "100.000 ₫"], ["Mỗi khách", "1 lượt"]]),
      row("FREESHIP", ["FREESHIP", "Miễn phí giao", "Toàn đơn", "78 / 300", "15/09/2026"], "Đang chạy", [["Đơn tối thiểu", "699.000 ₫"], ["Giảm tối đa", "35.000 ₫"]]),
      row("MOMDAY", ["MOMDAY", "Giảm 80.000 ₫", "Thời trang mẹ", "0 / 100", "05/09/2026"], "Đã lên lịch", [["Bắt đầu", "01/09/2026 00:00"], ["Kết thúc", "05/09/2026 23:59"]]),
    ],
  },
  reviews: {
    title: "Đánh giá",
    description: "Kiểm duyệt đánh giá và ảnh từ đơn mua đã xác thực.",
    headers: ["Người đánh giá", "Sản phẩm", "Điểm", "Ngày gửi", "Đơn mua"],
    statuses: ["Chờ duyệt", "Đã duyệt", "Từ chối"],
    rows: [
      row("review-1", ["Nguyễn Minh Anh", "Đầm bầu linen An Nhiên", "5 / 5", "28/08/2026", "#AN26082609"], "Chờ duyệt", [["Nội dung", "Vải mềm, mặc thoải mái và đúng size."], ["Ảnh", "2 ảnh đính kèm"], ["Đã mua", "Có"]]),
      row("review-2", ["Lê Thu Trang", "Body sơ sinh Mây Nhỏ", "5 / 5", "27/08/2026", "#AN26082402"], "Đã duyệt", [["Nội dung", "Chất cotton mềm và đường may đẹp."], ["Đã mua", "Có"]]),
    ],
  },
  content: {
    title: "Nội dung",
    description: "Quản lý trang chính sách, bài viết và banner cửa hàng.",
    createLabel: "Tạo nội dung",
    headers: ["Tiêu đề", "Loại", "Slug / vị trí", "Cập nhật", "Người sửa"],
    statuses: ["Đã đăng", "Bản nháp", "Đã lưu trữ"],
    rows: [
      row("content-1", ["Chọn size đồ bầu", "Bài viết", "chon-size-do-bau", "28/08/2026", "Thu Nguyễn"], "Đã đăng", [["SEO title", "Cách chọn size đồ bầu theo tam cá nguyệt"], ["Lịch đăng", "28/08/2026 08:00"]]),
      row("content-2", ["Hero Thu dịu dàng", "Banner", "homepage.hero", "27/08/2026", "An An Admin"], "Đã đăng", [["Liên kết", "/products?collection=thu-diu-dang"], ["Thiết bị", "Desktop & mobile"]]),
      row("content-3", ["Chính sách đổi trả", "Trang", "chinh-sach-doi-tra", "26/08/2026", "Thu Nguyễn"], "Bản nháp", [["Kiểm duyệt", "Chờ chủ cửa hàng"]]),
    ],
  },
  audit: {
    title: "Nhật ký kiểm toán",
    description: "Lịch sử bất biến của thao tác quản trị quan trọng.",
    headers: ["Thời gian", "Người thực hiện", "Hành động", "Đối tượng", "Địa chỉ IP"],
    statuses: ["Thành công", "Từ chối", "Lỗi"],
    rows: [
      row("audit-1", ["28/08/2026 09:42", "admin@ananshop.vn", "ORDER.STATUS_UPDATED", "order/AN26082718", "14.161.22.8"], "Thành công", [["Trước", "PROCESSING"], ["Sau", "SHIPPING"], ["Request ID", "req_01J6DY3D"]]),
      row("audit-2", ["28/08/2026 09:28", "thu@ananshop.vn", "INVENTORY.ADJUSTED", "variant/AN-BOD-03M", "14.161.22.8"], "Thành công", [["Thay đổi", "+5"], ["Lý do", "Nhập bù kiểm kê"], ["Tham chiếu", "ADJ-240828"]]),
      row("audit-3", ["28/08/2026 08:51", "staff@ananshop.vn", "SETTINGS.UPDATED", "store/settings", "14.161.22.19"], "Từ chối", [["Lý do", "Thiếu quyền settings:update"], ["Request ID", "req_01J6DWWA"]]),
    ],
  },
};

export const adminNav = [
  ["/admin", "Tổng quan"], ["/admin/orders", "Đơn hàng"], ["/admin/products", "Sản phẩm"],
  ["/admin/customers", "Khách hàng"],
  ["/admin/promotions", "Khuyến mãi"], ["/admin/returns", "Đổi trả"], ["/admin/reviews", "Đánh giá"], ["/admin/content", "Nội dung"],
  ["/admin/settings", "Cài đặt"], ["/admin/audit", "Nhật ký"],
] as const;
