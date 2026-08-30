"use client";
import { useEffect, useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/storefront/api";

type Review = { id: string; rating: number; title?: string; content?: string; verifiedPurchase: boolean; fullName: string; imageUrls: string[]; createdAt: string };
const normalize = (row: Record<string, unknown>): Review => ({ id: String(row.id), rating: Number(row.rating), title: row.title ? String(row.title) : undefined, content: row.content ? String(row.content) : undefined, verifiedPurchase: Boolean(row.verifiedPurchase ?? row.verified_purchase), fullName: String(row.fullName ?? row.full_name ?? "Khách hàng An An"), imageUrls: Array.isArray(row.imageUrls ?? row.image_urls) ? (row.imageUrls ?? row.image_urls) as string[] : [], createdAt: String(row.createdAt ?? row.created_at ?? "") });

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = () => apiRequest<{ items: Record<string, unknown>[] }>(`/api/reviews?productId=${encodeURIComponent(productId)}`, { method: "GET" }).then((data) => setReviews(data.items.map(normalize))).catch((reason) => { setError(reason instanceof Error ? reason.message : "Không thể tải đánh giá."); setReviews([]); });
  
  useEffect(() => { 
    void load(); 
    if (typeof window !== "undefined" && window.location.search.includes("action=review")) {
      setShowForm(true);
    }
  }, [productId]);

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");
    try {
      await apiRequest("/api/reviews", { 
        method: "POST", 
        body: JSON.stringify({ productId, rating: formRating, comment: formComment }) 
      });
      setSubmitMessage("Cảm ơn bạn! Đánh giá của bạn đã được ghi nhận.");
      setShowForm(false);
      setFormComment("");
      // Reload reviews immediately so the new review shows up
      load();
    } catch (err: any) {
      if (err.message && err.message.includes("Yêu cầu đăng nhập")) {
        setSubmitMessage("Vui lòng đăng nhập để có thể viết đánh giá.");
      } else {
        setSubmitMessage(err.message || "Có lỗi xảy ra khi gửi đánh giá.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedReviews = expanded ? reviews : reviews?.slice(0, 3);

  return <section className="mt-24" id="reviews">
    <div className="flex justify-between items-end border-b border-[#f2e4e6] pb-4">
      <div>
        <p className="text-xs font-semibold tracking-[.2em] text-[#c26b77]">ĐÁNH GIÁ THỰC TẾ</p>
        <h2 className="mt-2 font-serif text-3xl">Đánh giá từ khách đã mua</h2>
      </div>
    </div>
    
    {showForm && (
      <form onSubmit={submitReview} className="mt-6 rounded-2xl bg-[#fdfaf8] p-6 border border-[#f2e4e6]">
        <h3 className="font-serif text-xl mb-4">Trải nghiệm của bạn thế nào?</h3>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Điểm đánh giá</label>
          <div className="flex gap-2 text-2xl cursor-pointer">
            {[1, 2, 3, 4, 5].map(star => (
              <button type="button" key={star} onClick={() => setFormRating(star)} className={star <= formRating ? "text-[#b06b38]" : "text-gray-300"}>★</button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Chia sẻ thêm về sản phẩm (không bắt buộc)</label>
          <textarea rows={3} className="w-full rounded-xl border border-[#cbbfba] p-3 text-sm focus:border-[#ce7a85] focus:ring-[#ce7a85]" placeholder="Chất liệu vải thế nào? Form dáng có chuẩn không?..." value={formComment} onChange={(e) => setFormComment(e.target.value)}></textarea>
        </div>
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}</Button>
          <Button type="button" variant="text" onClick={() => setShowForm(false)}>Hủy</Button>
        </div>
      </form>
    )}

    {submitMessage && <p className={`mt-6 rounded-xl px-4 py-3 text-sm ${submitMessage.startsWith("Cảm ơn") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`} role="status">{submitMessage}</p>}
    {error && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}

    <div className="mt-8 grid gap-5 md:grid-cols-2">
      {displayedReviews?.map((review) => <article className="rounded-2xl bg-white p-6 shadow-sm border border-[#fcf4f5]" key={review.id}><p className="text-[#b06b38]" aria-label={`${review.rating} trên 5 sao`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p><h3 className="mt-3 font-semibold">{review.fullName}</h3>{review.title && <strong className="mt-3 block">{review.title}</strong>}{review.content && <p className="mt-2 text-sm leading-6 text-[#665a5a]">{review.content}</p>}{review.imageUrls.length > 0 && <div className="mt-4 flex gap-2">{review.imageUrls.map((url) => <img className="size-20 rounded-lg object-cover" src={url} alt="Ảnh đánh giá" key={url} />)}</div>}</article>)}
      {reviews && !reviews.length && <p className="col-span-full rounded-2xl border bg-white p-8 text-center text-sm text-[#665a5a]">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên!</p>}
    </div>

    {reviews && reviews.length > 3 && (
      <div className="mt-8 flex justify-center">
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setExpanded(!expanded)}>{expanded ? "Thu gọn" : `Xem thêm ${reviews.length - 3} đánh giá`}</Button>
      </div>
    )}
  </section>;
}
