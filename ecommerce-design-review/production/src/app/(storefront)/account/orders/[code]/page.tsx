import { AccountOrderDetailClient } from "@/components/storefront/account-order-detail-client";
export default async function OrderDetailPage({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return <AccountOrderDetailClient id={code}/>; }
