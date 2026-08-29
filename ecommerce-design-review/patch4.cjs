const fs = require('fs');
let content = fs.readFileSync('src/NewApp.tsx', 'utf8');

// 1. Add "warehouses" to the Admin tabs
content = content.replace(
  'const labels:Record<string,string>={overview:"Tổng quan",orders:"Đơn hàng",products:"Sản phẩm",content:"Nội dung",customers:"Khách hàng"};',
  'const labels:Record<string,string>={overview:"Tổng quan",orders:"Đơn hàng",products:"Sản phẩm",warehouses:"Đa kho",content:"Nội dung",customers:"Khách hàng"};'
);

// 2. Add warehouse rendering logic inside Admin component
// We inject a conditional check for adminTab === "warehouses"
const targetStr = '{adminTab==="overview"&&<AdminOverview/>}{adminTab==="orders"&&<AdminTable title="Đơn hàng" headers={["Mã ĐH","Khách hàng","Ngày","Tổng tiền","Trạng thái"]} rows={orders.map(o=>[o.id.toUpperCase(),o.customerName,o.date,formatMoney(o.total),status[o.status]])}/>}{adminTab==="products"&&<AdminTable title="Sản phẩm" headers={["Tên","Danh mục","Giá bán","Tồn kho","Trạng thái"]} rows={products.map(p=>[p.name,p.categoryLabel,formatMoney(p.price),p.sizes.reduce((a,b)=>a+b.stock,0).toString(),"Đang bán"])}/>}';
const newStr = '{adminTab==="warehouses"&&<div className="admin-page"><div className="admin-heading"><h1>Quản lý Đa Kho</h1><button className="btn primary" onClick={()=>alert("API: api.warehouses.create() sẽ được gọi")}>+ Tạo Kho Mới</button></div><div className="admin-table"><table><thead><tr><th>Mã Kho</th><th>Tên Kho</th><th>Địa chỉ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody><tr><td>WH-HCM-01</td><td>Kho Tổng TP.HCM</td><td>TP.HCM</td><td><span className="status">Hoạt động</span></td><td><button className="text-link" onClick={()=>alert("API: api.warehouses.inventory() sẽ được gọi để xem tồn kho")}>Xem Tồn Kho</button> | <button className="text-link" onClick={()=>alert("API: api.warehouses.transfer() sẽ được gọi để điều chuyển")}>Điều Chuyển</button></td></tr></tbody></table></div></div>}' + targetStr;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/NewApp.tsx', content);
