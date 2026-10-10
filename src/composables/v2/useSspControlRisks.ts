import { computed, watch, type Ref } from 'vue';
import { useDataApi } from '@/composables/axios';
import type { Risk } from '@/oscal';
import {
  getRiskComponentIds,
  getRiskControlIds,
  getRiskImpact,
  isClosedStatus,
} from '@/utils/risk-register';

// Open-risk counts per control (and per control + component) for the V2 risk
// badges (backlog M1-04). Ports the stats main builds inline in the V1
// control-implementation views, fetched once per SSP with main's 100-risk cap.
// Instantiate once per page; rows only read from it.

export const SSP_RISK_FETCH_LIMIT = 100;

export type RiskSeverity = 'high' | 'medium' | 'low';

export interface ControlRiskSummary {
  count: number;
  // True when the fetch hit the cap, so the real count may be higher.
  capped: boolean;
  severity: RiskSeverity;
}

function normalizeId(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function impactRank(impact: string): number {
  if (impact === 'critical' || impact === 'high') return 3;
  if (impact === 'medium' || impact === 'moderate') return 2;
  if (impact === 'low') return 1;
  return 0;
}

// A risk without an impact counts as high, as on main's control tree, so an
// unrated risk still draws attention.
function severityFromRank(rank: number): RiskSeverity {
  if (rank === 2) return 'medium';
  if (rank === 1) return 'low';
  return 'high';
}

function pairKey(controlId: string, componentId: string): string {
  return `${controlId}|${componentId}`;
}

export function useSspControlRisks(sspId: Ref<string | undefined>) {
  const url = computed(() =>
    sspId.value
      ? `/api/oscal/system-security-plans/${sspId.value}/risks?limit=${SSP_RISK_FETCH_LIMIT}`
      : null,
  );

  const {
    data: risks,
    error,
    execute,
  } = useDataApi<Risk[]>(null, {}, { immediate: false });

  watch(
    url,
    (value) => {
      if (!value) {
        risks.value = [];
        return;
      }
      // A failed fetch only hides the badges; it mustn't break the page.
      void execute(value).catch(() => undefined);
    },
    { immediate: true },
  );

  const stats = computed(() => {
    const ranks = new Map<string, number[]>();
    const add = (key: string, rank: number) => {
      const list = ranks.get(key);
      if (list) list.push(rank);
      else ranks.set(key, [rank]);
    };

    for (const risk of risks.value ?? []) {
      if (isClosedStatus(risk.status)) continue;
      const rank = impactRank(getRiskImpact(risk));
      const controlIds = new Set(
        getRiskControlIds(risk).map(normalizeId).filter(Boolean),
      );
      const componentIds = new Set(
        getRiskComponentIds(risk).map(normalizeId).filter(Boolean),
      );
      for (const controlId of controlIds) {
        add(controlId, rank);
        for (const componentId of componentIds) {
          add(pairKey(controlId, componentId), rank);
        }
      }
    }
    return ranks;
  });

  const capped = computed(
    () => (risks.value?.length ?? 0) >= SSP_RISK_FETCH_LIMIT,
  );

  function summarize(key: string): ControlRiskSummary | null {
    const list = stats.value.get(key);
    if (!list?.length) return null;
    const ranked = list.filter((rank) => rank > 0);
    return {
      count: list.length,
      capped: capped.value,
      severity:
        ranked.length < list.length
          ? 'high'
          : severityFromRank(Math.max(...ranked)),
    };
  }

  function controlRisks(controlId?: string): ControlRiskSummary | null {
    return controlId ? summarize(normalizeId(controlId)) : null;
  }

  function componentRisks(
    controlId?: string,
    componentId?: string,
  ): ControlRiskSummary | null {
    if (!controlId || !componentId) return null;
    return summarize(pairKey(normalizeId(controlId), normalizeId(componentId)));
  }

  return { risks, error, controlRisks, componentRisks };
}
