import { ButtonLink } from "./button";

export function EmptyState({ title, description, actionHref = "/products", action = "Khám phá sản phẩm" }: { title: string; description: string; actionHref?: string; action?: string }) {
  return <section className="mx-auto flex max-w-lg flex-col items-center py-20 text-center" aria-live="polite"><span className="mb-5 grid size-14 place-items-center rounded-full bg-[#f3e5de] text-2xl" aria-hidden>♡</span><h2 className="font-serif text-3xl text-[#332824]">{title}</h2><p className="mt-3 text-[#6d625d]">{description}</p><ButtonLink href={actionHref} className="mt-7">{action}</ButtonLink></section>;
}

export function ErrorState({ title = "Có điều gì đó chưa ổn", description = "An An chưa thể tải nội dung này. Mẹ vui lòng thử lại sau ít phút." }: { title?: string; description?: string }) {
  return <section className="mx-auto max-w-xl py-20 text-center" role="alert"><span className="text-3xl" aria-hidden>!</span><h2 className="mt-3 font-serif text-3xl">{title}</h2><p className="mt-3 text-[#6d625d]">{description}</p><ButtonLink href="/" className="mt-7">Về trang chủ</ButtonLink></section>;
}

export function PageSkeleton() {
  return <div className="mx-auto max-w-7xl animate-pulse px-4 py-12 sm:px-6"><div className="h-8 w-52 rounded bg-stone-200"/><div className="mt-4 h-4 w-80 max-w-full rounded bg-stone-100"/><div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i}><div className="aspect-[4/5] rounded-3xl bg-stone-200"/><div className="mt-3 h-4 rounded bg-stone-100"/></div>)}</div><span className="sr-only">Đang tải nội dung</span></div>;
}
