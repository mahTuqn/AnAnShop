import { EmptyState } from "@/components/ui/states";
export default function OrderNotFound() { return <EmptyState title="Không tìm thấy đơn hàng" description="Mẹ kiểm tra lại mã đơn hoặc đăng nhập đúng tài khoản nhé." actionHref="/account/orders" action="Xem danh sách đơn"/>; }
