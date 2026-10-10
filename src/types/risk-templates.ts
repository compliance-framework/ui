export interface ThreatIDRequest {
  system: string;
  id: string;
  title: string;
  url?: string;
}

export interface RemediationTaskRequest {
  title: string;
  orderIndex: number;
}

export interface RemediationTask {
  title: string;
  orderIndex?: number;
}

export interface RemediationTemplateRequest {
  title: string;
  description?: string;
  tasks?: RemediationTaskRequest[];
}

export interface RemediationTemplate {
  title: string;
  description?: string;
  tasks?: RemediationTask[];
}

export interface UpsertRiskTemplateRequest {
  pluginId: string;
  policyPackage: string;
  name: string;
  title: string;
  statement: string;
  likelihoodHint?: string;
  impactHint?: string;
  violationIds?: string[];
  threatIds?: ThreatIDRequest[];
  remediationTemplate?: RemediationTemplateRequest;
  isActive?: boolean;
}

export interface RiskTemplate {
  id?: string;
  uuid?: string;
  pluginId?: string;
  policyPackage?: string;
  name?: string;
  title: string;
  statement?: string;
  likelihoodHint?: string;
  impactHint?: string;
  violationIds?: string[];
  threatIds?: ThreatIDRequest[];
  remediationTemplate?: RemediationTemplate;
  isActive?: boolean;
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
  const apiId = getRiskTemplateApiId(template);
  if (apiId) {
    return apiId;
  }

  const parts = [
    template.pluginId,
    template.policyPackage,
    template.name,
    template.title,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0));

  if (parts.length > 0) {
    return parts.join('::');
  }

  return '';
}

export function getRiskTemplateUsageCount(template: RiskTemplate): number {
  return template.usageCount ?? 0;
}
