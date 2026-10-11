import { apiRequest, toQuery } from "@/lib/services/helpers";
import type { ApiResponse, Paginated, Product, ProductStatus, ProductTier } from "@/lib/types";

export interface ProductQuery {
  search?: string;
  tier?: ProductTier | "all";
  status?: ProductStatus | "all";
  featured?: boolean;
  minEntry?: number;
  maxDuration?: number;
  sort?: "recommended" | "entry_asc" | "entry_desc" | "duration_asc" | "duration_desc" | "newest";
  page?: number;
  pageSize?: number;
}

export async function getProducts(query: ProductQuery = {}): Promise<ApiResponse<Paginated<Product>>> {
  return apiRequest<Paginated<Product>>(
    `/api/products${toQuery(query as Record<string, unknown>)}`
  );
}

export async function getProductBySlug(slug: string): Promise<ApiResponse<Product>> {
  return apiRequest<Product>(`/api/products/${encodeURIComponent(slug)}`);
}

export async function getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
  return apiRequest<Product[]>("/api/products/featured");
}
