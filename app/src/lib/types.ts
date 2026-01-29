export type TakeStatus = "PENDING" | "VERIFIED" | "WRONG";

export interface Take {
  id: string;
  text: string;
  author: string;
  hash: string | null;
  createdAt: string;
  lockedAt: string;
  resolvesAt: string | null;
  resolvedAt: string | null;
  status: TakeStatus;
  userId: string | null;
}
