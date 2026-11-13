import type { RiskTemplate } from '@/types/risk-templates';

// Risk templates (admin-managed) prefill a new risk: title, statement, likelihood and impact
// hints, threats and a remediation plan. Shared by the classic create form and the redesigned
// risk dialog.

const RISK_LEVELS = ['negligible', 'low', 'moderate', 'high', 'critical'];

export function normalizeRiskLevel(value?: string | null): string {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return '';
  const canonical = normalized === 'medium' ? 'moderate' : normalized;
  return RISK_LEVELS.includes(canonical) ? canonical : '';
}
export function toOptionalString(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getTemplateMetadataString(
  value: unknown,
  fallbackPrefix: string,
): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0) {
    return `${fallbackPrefix}: ${value.join(', ')}`;
  }
  return null;
}

export function getStatementFromTemplate(template: RiskTemplate): string {
  if (template.statement?.trim()) {
    return template.statement.trim();
  }
  return template.title;
}

export function getThreatIdsFromTemplate(template: RiskTemplate) {
  if (!Array.isArray(template.threatIds)) {
    return undefined;
  }

  const threatIds = template.threatIds.reduce<
    Array<{ system: string; id: string; title: string; url?: string }>
  >((acc, threat) => {
    const system = threat.system?.trim();
    const id = threat.id?.trim();
    const title = threat.title?.trim();

    if (!system || !id || !title) {
      return acc;
    }

    acc.push({
      system,
      id,
      title,
      url: toOptionalString(threat.url),
    });
    return acc;
  }, []);

  return threatIds.length ? threatIds : undefined;
}

export function getRemediationTemplateFromTemplate(template: RiskTemplate) {
  const title = template.remediationTemplate?.title?.trim();
  if (!title) {
    return undefined;
  }

  const tasks = (template.remediationTemplate?.tasks ?? []).reduce<
    Array<{ title: string; orderIndex: number }>
  >((acc, task) => {
    const taskTitle = task.title?.trim();
    if (!taskTitle) {
      return acc;
    }

    acc.push({
      title: taskTitle,
      orderIndex: acc.length + 1,
    });
    return acc;
  }, []);

  return {
    title,
    description: toOptionalString(template.remediationTemplate?.description),
    tasks: tasks.length ? tasks : undefined,
  };
}

export function buildTemplateRemarks(template: RiskTemplate): string {
  const parts: string[] = [];

  if (template.likelihoodHint) {
    parts.push(`Likelihood hint: ${template.likelihoodHint}`);
  }
  if (template.impactHint) {
    parts.push(`Impact hint: ${template.impactHint}`);
  }

  const violationsLine = getTemplateMetadataString(
    template.violationIds,
    'Violation IDs',
  );
  if (violationsLine) {
    parts.push(violationsLine);
  }

  return parts.join('\n');
}

export function formatLikelihoodImpact(template: RiskTemplate): string {
  const likelihood = template.likelihoodHint ?? 'N/A';
  const impact = template.impactHint ?? 'N/A';
  return `${likelihood} / ${impact}`;
}
