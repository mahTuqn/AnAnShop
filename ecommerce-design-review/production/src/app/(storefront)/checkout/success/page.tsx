import { CheckoutResult } from "@/components/storefront/checkout-result";
export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) { const { code = "AN24082801" } = await searchParams; return <CheckoutResult success code={code}/>; }
