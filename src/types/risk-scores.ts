/**
 * RiskScore represents a single point-in-time score entry for a risk.
 *
 * The first entry for a risk carries scoreType === 'baseline' (the inherent
 * risk before any mitigations are applied). All subsequent entries produced by
 * score-reassess reviews carry scoreType === 'residual'.
 *
 * The numerical score is computed as:
 *   score = levelRank(likelihood) × levelRank(impact)
 * where levelRank maps negligible→1, low→2, moderate→3, high→4, critical→5,
 * giving a range of 1–25.
 */
export type RiskScoreType = 'baseline' | 'residual';

export interface RiskScore {
  id: string;
  riskId: string;
  sspId: string;
  score: number;
  scoreType: RiskScoreType;
  likelihood: string;
  impact: string;
  actorUserId: string | null;
  occurredAt: string;
  createdAt: string;
}
