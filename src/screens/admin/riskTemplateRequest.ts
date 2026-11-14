/**
 * The risk template form's data and the request it becomes, moved from the classic page so the
 * form and the list's Duplicate share them.
 */
import type {
  RiskTemplate,
  ThreatIDRequest,
  UpsertRiskTemplateRequest,
} from '@/types/risk-templates';

export interface RiskTemplateFormData {
  pluginId: string;
  policyPackage: string;
  name: string;
  title: string;
  statement: string;
  likelihoodHint: string;
  impactHint: string;
  violationIds: { id: string }[];
  threatIds: ThreatIDRequest[];
  enableRemediation: boolean;
  remediationTitle: string;
  remediationDescription: string;
  remediationTasks: { title: string }[];
  isActive: '' | 'true' | 'false';
}

export function emptyRiskTemplateForm(): RiskTemplateFormData {
  return {
    pluginId: '',
    policyPackage: '',
    name: '',
    title: '',
    statement: '',
    likelihoodHint: '',
    impactHint: '',
    violationIds: [],
    threatIds: [],
    enableRemediation: false,
    remediationTitle: '',
    remediationDescription: '',
    remediationTasks: [],
    isActive: '',
  };
}

export function riskTemplateFormFrom(
  template: RiskTemplate,
): RiskTemplateFormData {
  return {
    pluginId: template.pluginId ?? '',
    policyPackage: template.policyPackage ?? '',
    name: template.name ?? '',
    title: template.title,
    statement: template.statement ?? '',
    likelihoodHint: template.likelihoodHint ?? '',
    impactHint: template.impactHint ?? '',
    violationIds: (template.violationIds ?? []).map((id) => ({ id })),
    threatIds: (template.threatIds ?? []).map((threat) => ({
      system: threat.system,
      id: threat.id,
      title: threat.title,
      url: threat.url ?? '',
    })),
    enableRemediation: !!template.remediationTemplate,
    remediationTitle: template.remediationTemplate?.title ?? '',
    remediationDescription: template.remediationTemplate?.description ?? '',
    remediationTasks: (template.remediationTemplate?.tasks ?? []).map(
      (task) => ({ title: task.title }),
    ),
    isActive:
      template.isActive === undefined
        ? ''
        : template.isActive
          ? 'true'
          : 'false',
  };
}

function toOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

type ThreatIdInput = {
  system?: string;
  id?: string;
  title?: string;
  url?: string | null;
};

/** Drops empty rows; a row with anything in it needs a system, ID and title. */
export function normalizeThreatIds(
  threats: ThreatIdInput[] | undefined,
): ThreatIDRequest[] {
  const normalized = (threats ?? [])
    .map((threat) => ({
      system: threat.system?.trim() ?? '',
      id: threat.id?.trim() ?? '',
      title: threat.title?.trim() ?? '',
      url: toOptionalString(threat.url ?? ''),
    }))
    .filter(
      (threat) => threat.system || threat.id || threat.title || threat.url,
    );
  for (const threat of normalized) {
    if (!threat.system || !threat.id || !threat.title) {
      throw new Error('Each threat ID needs a system, an ID and a title.');
    }
  }
  return normalized;
}

/** Numbers tasks from 1 in their order, dropping untitled ones. */
function numberTasks(tasks: { title?: string }[] | undefined) {
  const titled = (tasks ?? [])
    .map((task) => task.title?.trim() ?? '')
    .filter(Boolean);
  return titled.map((title, index) => ({ title, orderIndex: index + 1 }));
}

/** Throws with a message for the form when the remediation or threats are incomplete. */
export function riskTemplateRequest(
  form: RiskTemplateFormData,
): UpsertRiskTemplateRequest {
  const violationIds = form.violationIds
    .map((violation) => violation.id.trim())
    .filter(Boolean);
  const threatIds = normalizeThreatIds(form.threatIds);
  let remediationTemplate: UpsertRiskTemplateRequest['remediationTemplate'];
  if (form.enableRemediation) {
    const title = form.remediationTitle.trim();
    if (!title) {
      throw new Error('Enter a remediation title, or leave remediation out.');
    }
    const tasks = numberTasks(form.remediationTasks);
    remediationTemplate = {
      title,
      description: toOptionalString(form.remediationDescription),
      tasks: tasks.length ? tasks : undefined,
    };
  }
  return {
    pluginId: form.pluginId.trim(),
    policyPackage: form.policyPackage.trim(),
    name: form.name.trim(),
    title: form.title.trim(),
    statement: form.statement.trim(),
    likelihoodHint: toOptionalString(form.likelihoodHint),
    impactHint: toOptionalString(form.impactHint),
    violationIds: violationIds.length ? violationIds : undefined,
    threatIds: threatIds.length ? threatIds : undefined,
    remediationTemplate,
    isActive: form.isActive === '' ? undefined : form.isActive === 'true',
  };
}

/** A copy of a template: "(Copy)" on the title and "-copy" on the name. */
export function duplicateRiskTemplateRequest(
  template: RiskTemplate,
): UpsertRiskTemplateRequest {
  const pluginId = template.pluginId?.trim() ?? '';
  const policyPackage = template.policyPackage?.trim() ?? '';
  const name = template.name?.trim() ?? '';
  const title = template.title?.trim() ?? '';
  const statement = template.statement?.trim() ?? '';
  if (!pluginId || !policyPackage || !name || !title || !statement) {
    throw new Error(
      "This template is missing a plugin ID, policy package, name, title or statement, so it can't be duplicated.",
    );
  }
  const threatIds = normalizeThreatIds(template.threatIds);
  const tasks = numberTasks(template.remediationTemplate?.tasks);
  return {
    pluginId,
    policyPackage,
    name: `${name}-copy`,
    title: `${title} (Copy)`,
    statement,
    likelihoodHint: template.likelihoodHint,
    impactHint: template.impactHint,
    violationIds: template.violationIds
      ? [...template.violationIds]
      : undefined,
    threatIds: threatIds.length ? threatIds : undefined,
    remediationTemplate: template.remediationTemplate
      ? {
          title: template.remediationTemplate.title,
          description:
            template.remediationTemplate.description?.trim() || undefined,
          tasks: template.remediationTemplate.tasks ? tasks : undefined,
        }
      : undefined,
    isActive: template.isActive,
  };
}
