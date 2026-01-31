export type TakeStatus = "PENDING" | "VERIFIED" | "WRONG";

export interface Take {
  id: string;
  text: string;
  author: string;
  hash: string | null;
  // AI verification fields
  aiVerified: boolean;
  aiSubject: string | null;
  aiPrediction: string | null;
  aiTimeframe: string | null;
  aiResolutionCriteria: string | null;
  // Timestamps
  createdAt: string;
  lockedAt: string;
  resolvesAt: string | null;
  resolvedAt: string | null;
  status: TakeStatus;
  clerkUserId: string | null;
}

export interface AIVerificationResult {
  isVerifiable: boolean;
  refinedTake: string | null;
  subject: string | null;
  prediction: string | null;
  timeframe: string | null;
  resolutionCriteria: string | null;
  suggestedResolutionDate: string | null;
  needsSpecificTime?: boolean;
  explanation: string;
}
