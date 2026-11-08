export type CartwiseConfig = {
  baseUrl: string;
  getAuthToken?: () => string | null | Promise<string | null>;
};

export type ShoppingRequest = {
  query: string;
  budget?: { currency: "INR" | "USD" | string; max?: number };
  requirements?: string[];
};

export type Product = {
  id: string;
  title: string;
  merchant: string;
  price: number;
  currency: string;
  rating?: number;
  url: string;
};

export type ResearchResponse = {
  requestId: string;
  products: Product[];
};

export type ComparisonResponse = {
  requestId: string;
  rows: Array<{ productId: string; specs: Record<string, string | number>; score: number }>;
};

export type RecommendationResponse = {
  requestId: string;
  recommendedProductId: string;
  reasoning: string;
};

export type CartPreparation = {
  cartId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  total: number;
  currency: string;
};

export type ApprovalRequest = {
  cartId: string;
  approved: boolean;
};

export type ApprovalResponse = {
  cartId: string;
  status: "pending" | "approved" | "rejected" | "paid";
  paypalOrderId?: string;
};

export class CartwiseApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "CartwiseApiError";
  }
}

export function createCartwiseClient(config: CartwiseConfig) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = config.getAuthToken ? await config.getAuthToken() : null;
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!res.ok) {
      throw new CartwiseApiError(res.status, `Cartwise request failed: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  return {
    /** Agents research products across online stores. */
    research: (input: ShoppingRequest) =>
      request<ResearchResponse>("/research", { method: "POST", body: JSON.stringify(input) }),

    /** Compare prices, specifications, and features. */
    compare: (requestId: string, productIds: string[]) =>
      request<ComparisonResponse>("/compare", {
        method: "POST",
        body: JSON.stringify({ requestId, productIds }),
      }),

    /** Recommend the best product for the user's requirements. */
    recommend: (requestId: string) =>
      request<RecommendationResponse>(`/recommendations/${requestId}`),

    /** Prepare the shopping cart and checkout details. */
    prepareCart: (requestId: string, productId: string, quantity = 1) =>
      request<CartPreparation>("/cart", {
        method: "POST",
        body: JSON.stringify({ requestId, productId, quantity }),
      }),

    /** Record the user's explicit approval before any PayPal payment. */
    approve: (input: ApprovalRequest) =>
      request<ApprovalResponse>(`/cart/${input.cartId}/approval`, {
        method: "POST",
        body: JSON.stringify({ approved: input.approved }),
      }),
  };
}

export type CartwiseClient = ReturnType<typeof createCartwiseClient>;
