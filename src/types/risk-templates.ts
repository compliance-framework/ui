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

export interface RemediationTemplateRequest {
  title: string;
  description?: string;
  tasks?: RemediationTaskRequest[];
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
  remediationTemplate?: RemediationTemplateRequest;
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
  return getRiskTemplateApiId(template) ?? template.title;
}

export function getRiskTemplateUsageCount(template: RiskTemplate): number {
  return template.usageCount ?? 0;
}
