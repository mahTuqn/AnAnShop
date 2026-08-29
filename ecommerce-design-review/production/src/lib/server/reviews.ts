import { AppError } from "@/modules/shared";

export function reviewImageUrls(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5) throw new AppError("VALIDATION_ERROR", "Tối đa 5 ảnh đánh giá", 400);
  return value.map((item) => {
    if (typeof item !== "string" || item.length > 2_048) throw new AppError("VALIDATION_ERROR", "URL ảnh đánh giá không hợp lệ", 400);
    let url: URL;
    try { url = new URL(item); } catch { throw new AppError("VALIDATION_ERROR", "URL ảnh đánh giá không hợp lệ", 400); }
    if (url.protocol !== "https:") throw new AppError("VALIDATION_ERROR", "Ảnh đánh giá phải dùng HTTPS", 400);
    return url.toString();
  });
}
