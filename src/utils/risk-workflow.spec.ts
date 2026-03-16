import { describe, expect, it } from 'vitest';
import {
  canAcceptRisk,
  canReviewRisk,
  getAllowedRiskTransitions,
  normalizeRiskRegisterStatus,
  riskStatusLabel,
  riskWorkflowHints,
  riskWorkflowStage,
  riskWorkflowStageSummary,
} from './risk-workflow';

describe('risk-workflow', () => {
  describe('normalizeRiskRegisterStatus', () => {
    it('normalizes mixed-case and spaced values', () => {
      expect(normalizeRiskRegisterStatus(' investigating ')).toBe(
        'investigating',
      );
      expect(normalizeRiskRegisterStatus('RISK-ACCEPTED')).toBe(
        'risk-accepted',
      );
      expect(normalizeRiskRegisterStatus('accepted')).toBe('risk-accepted');
    });

    it('returns null for unknown statuses', () => {
      expect(normalizeRiskRegisterStatus('deviation-requested')).toBeNull();
      expect(normalizeRiskRegisterStatus('')).toBeNull();
    });
  });

  it('maps risk status labels', () => {
    expect(riskStatusLabel('mitigating-implemented')).toBe(
      'Mitigating Implemented',
    );
    expect(riskStatusLabel('custom-status')).toBe('Custom Status');
  });

  it('returns API-aligned status transitions', () => {
    expect(getAllowedRiskTransitions('open')).toEqual([
      'investigating',
      'closed',
    ]);
    expect(getAllowedRiskTransitions('investigating')).toEqual([
      'mitigating-planned',
      'risk-accepted',
    ]);
    expect(getAllowedRiskTransitions('risk-accepted')).toEqual([
      'investigating',
      'closed',
    ]);
    expect(getAllowedRiskTransitions('closed')).toEqual([]);
  });

  it('supports accept/review eligibility', () => {
    expect(canAcceptRisk('investigating')).toBe(true);
    expect(canAcceptRisk('open')).toBe(false);
    expect(canReviewRisk('risk-accepted')).toBe(true);
    expect(canReviewRisk('mitigating-planned')).toBe(false);
  });

  it('maps statuses into workflow stages with summaries', () => {
    expect(riskWorkflowStage('open')).toBe('intake');
    expect(riskWorkflowStage('mitigating-planned')).toBe('mitigation');
    expect(riskWorkflowStage('risk-accepted')).toBe('accepted');

    expect(riskWorkflowStageSummary('accepted').title).toBe('Accepted');
    expect(riskWorkflowStageSummary('closed').description).toContain(
      'complete',
    );
  });

  it('builds action hints for accept/review states', () => {
    expect(riskWorkflowHints('investigating')[0]).toContain('Accept Risk');
    expect(riskWorkflowHints('risk-accepted')[0]).toContain('Review Risk');
    expect(riskWorkflowHints('closed')[0]).toContain('No workflow actions');
  });
});
