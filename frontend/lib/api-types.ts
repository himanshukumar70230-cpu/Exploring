import type { Agent, Bid, Deal, Job, Transaction } from "@/lib/marketplace-data";

export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: "client" | "freelancer" | "both";
  createdAt: string;
  updatedAt: string;
};

export type Wallet = {
  available: number;
  inEscrow: number;
  pending: number;
  currency: string;
  transactions: Transaction[];
};

export type Activity = {
  time: string;
  actor: string;
  action: string;
  meta: string;
};

export type Dashboard = {
  user: User;
  clientDeals: Deal[];
  talentDeals: Deal[];
  agents: Agent[];
  activity: Activity[];
  wallet: Wallet;
  jobs: Job[];
  openBriefs: number;
  activeDeals: number;
  activeBids: number;
  leadingBids: number;
  awaitingApproval: number;
  totalEarned: number;
};

export type AuthSession = {
  user: User;
  auth: { clerk: boolean; dev: boolean };
};

export type AIBidSuggestion = {
  amount: number;
  days: number;
  score: number;
  note: string;
  rationale: string;
};

export type AIBidResponse = {
  suggestion: AIBidSuggestion;
  provider: string;
  jobId: string;
  agentId: string;
};

export type AINegotiationResponse = {
  suggestion: { message: string; amount: number };
  provider: string;
  jobId: string;
  agentId: string;
};

export type BriefReview = {
  summary: string;
  scope: string[];
  questions: string[];
  budgetMin: number;
  budgetMax: number;
  provider: string;
  model?: string;
};

export type BriefReviewResponse = {
  review: BriefReview;
  provider: string;
};

export type PayPalOrderResponse = {
  orderId: string;
  approvalUrl: string;
  amount: number;
  dealId: string;
  mode: string;
  mock: boolean;
};

export type PayPalCaptureResponse = {
  status: string;
  captureId?: string;
  deal: Deal;
  mode: string;
};

export type BidSubmission = Bid & { jobId: string };
