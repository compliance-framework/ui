export interface RiskTemplate {
  id?: string;
  uuid?: string;
  title: string;
  description: string;
  defaultStatus?: string;
  defaultLikelihood?: string;
  defaultImpact?: string;
  suggestedControls?: string[];
  suggestedComponents?: string[];
  metadata?: Record<string, unknown>;
  usageCount?: number;
  createdAt?: string;
  createdDate?: string;
}

export function getRiskTemplateApiId(
  template: RiskTemplate,
): string | undefined {
  return template.id ?? template.uuid;
}

export function getRiskTemplateKey(template: RiskTemplate): string {
  return getRiskTemplateApiId(template) ?? template.title;
}

export function getRiskTemplateUsageCount(template: RiskTemplate): number {
  return template.usageCount ?? 0;
}
