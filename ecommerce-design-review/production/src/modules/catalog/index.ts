import { AppError, Result, Vnd, err, ok } from "../shared";

export interface ProductVariant { id: string; sku: string; name: string; price: Vnd; compareAtPrice?: Vnd; available: number; active: boolean }
export interface ProductSummary { id: string; slug: string; name: string; categorySlug: string; imageUrl?: string; images?: string[]; featured: boolean; variants: ProductVariant[] }
export interface ProductQuery { search?: string; category?: string; featured?: boolean; page: number; pageSize: number }
export interface ProductPage { items: ProductSummary[]; page: number; pageSize: number; total: number }
export interface CatalogRepository {
  list(query: ProductQuery): Promise<ProductPage>;
  findBySlug(slug: string): Promise<ProductSummary | null>;
  findVariant(id: string): Promise<{ product: ProductSummary; variant: ProductVariant } | null>;
}

export class CatalogService {
  constructor(private readonly products: CatalogRepository) {}
  list(query: Partial<ProductQuery>): Promise<ProductPage> {
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 20)));
    return this.products.list({ ...query, page, pageSize });
  }
  async detail(slug: string): Promise<Result<ProductSummary>> {
    const product = await this.products.findBySlug(slug);
    return product ? ok(product) : err(new AppError("NOT_FOUND", "Không tìm thấy sản phẩm", 404));
  }
}

