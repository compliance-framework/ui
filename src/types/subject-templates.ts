import type { Link, Property } from '@/oscal/common';

export const SUBJECT_TEMPLATE_TYPES = [
  'component',
  'inventory-item',
  'location',
  'party',
  'user',
] as const;

export type SubjectTemplateType = (typeof SUBJECT_TEMPLATE_TYPES)[number];

export const SUBJECT_TEMPLATE_SOURCE_MODES = [
  'runtime-derived',
  'manual',
] as const;

export type SubjectTemplateSourceMode =
  (typeof SUBJECT_TEMPLATE_SOURCE_MODES)[number];

export const SUBJECT_TEMPLATE_TYPE_OPTIONS: Array<{
  label: string;
  value: SubjectTemplateType;
}> = [
  { label: 'Component', value: 'component' },
  { label: 'Inventory Item', value: 'inventory-item' },
  { label: 'Location', value: 'location' },
  { label: 'Party', value: 'party' },
  { label: 'User', value: 'user' },
];

export const SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS: Array<{
  label: string;
  value: SubjectTemplateSourceMode;
}> = [
  { label: 'Runtime-derived', value: 'runtime-derived' },
  { label: 'Manual', value: 'manual' },
];

export interface SubjectTemplateSelectorLabel {
  key: string;
  value: string;
}

export interface SubjectTemplateLabelSchemaField {
  key: string;
  description?: string;
}

export interface SubjectTemplate {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  name?: string;
  type?: SubjectTemplateType;
  titleTemplate?: string;
  descriptionTemplate?: string;
  purposeTemplate?: string;
  remarksTemplate?: string;
  identityLabelKeys?: string[];
  props?: Property[];
  links?: Link[];
  sourceMode?: SubjectTemplateSourceMode;
  selectorLabels?: SubjectTemplateSelectorLabel[];
  labelSchema?: SubjectTemplateLabelSchemaField[];
}

export interface UpsertSubjectTemplateRequest {
  name: string;
  type: SubjectTemplateType;
  titleTemplate?: string;
  descriptionTemplate?: string;
  purposeTemplate?: string;
  remarksTemplate?: string;
  identityLabelKeys: string[];
  props: Property[];
  links: Link[];
  sourceMode: SubjectTemplateSourceMode;
  selectorLabels: SubjectTemplateSelectorLabel[];
  labelSchema: SubjectTemplateLabelSchemaField[];
}

export interface SubjectTemplateSelectorLabelFormRow {
  key: string;
  value: string;
}

export interface SubjectTemplateLabelSchemaFormRow {
  key: string;
  description: string;
}

export interface SubjectTemplatePropertyFormRow {
  uuid: string;
  name: string;
  value: string;
  class: string;
  ns: string;
  remarks: string;
}

export interface SubjectTemplateLinkFormRow {
  href: string;
  rel: string;
  text: string;
}

export interface SubjectTemplateFormData {
  name: string;
  type: SubjectTemplateType;
  sourceMode: SubjectTemplateSourceMode;
  titleTemplate: string;
  descriptionTemplate: string;
  purposeTemplate: string;
  remarksTemplate: string;
  identityLabelKeys: string[];
  selectorLabels: SubjectTemplateSelectorLabelFormRow[];
  labelSchema: SubjectTemplateLabelSchemaFormRow[];
  props: SubjectTemplatePropertyFormRow[];
  links: SubjectTemplateLinkFormRow[];
}

export interface RenderTemplateResult {
  rendered: string;
  unresolvedKeys: string[];
}

const TEMPLATE_VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;

function toOptionalTrimmed(value?: string | null): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

function isAnyFilled(values: string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

export function createEmptySubjectTemplateForm(): SubjectTemplateFormData {
  return {
    name: '',
    type: SUBJECT_TEMPLATE_TYPES[0],
    sourceMode: SUBJECT_TEMPLATE_SOURCE_MODES[0],
    titleTemplate: '',
    descriptionTemplate: '',
    purposeTemplate: '',
    remarksTemplate: '',
    identityLabelKeys: [],
    selectorLabels: [],
    labelSchema: [],
    props: [],
    links: [],
  };
}

export function isSubjectTemplateType(
  value: string,
): value is SubjectTemplateType {
  return SUBJECT_TEMPLATE_TYPES.includes(value as SubjectTemplateType);
}

export function isSubjectTemplateSourceMode(
  value: string,
): value is SubjectTemplateSourceMode {
  return SUBJECT_TEMPLATE_SOURCE_MODES.includes(
    value as SubjectTemplateSourceMode,
  );
}

export function getSubjectTemplateTypeLabel(
  value?: SubjectTemplateType,
): string {
  const option = SUBJECT_TEMPLATE_TYPE_OPTIONS.find(
    (entry) => entry.value === value,
  );
  return option?.label ?? 'N/A';
}

export function getSubjectTemplateSourceModeLabel(
  value?: SubjectTemplateSourceMode,
): string {
  const option = SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS.find(
    (entry) => entry.value === value,
  );
  return option?.label ?? 'N/A';
}

export function getSubjectTemplateApiId(
  template: SubjectTemplate,
): string | undefined {
  return template.id;
}

export function getSubjectTemplateKey(template: SubjectTemplate): string {
  const apiId = getSubjectTemplateApiId(template);
  if (apiId) {
    return apiId;
  }

  const fallback = [template.name, template.type, template.sourceMode]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return fallback.join('::');
}

export function formatSubjectTemplateDate(rawDate?: string): string {
  if (!rawDate) {
    return 'N/A';
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }

  return parsed.toLocaleDateString();
}

export function extractTemplateVariables(template?: string | null): string[] {
  if (!template) {
    return [];
  }

  const variables = new Set<string>();
  for (const match of template.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const key = match[1]?.trim();
    if (key) {
      variables.add(key);
    }
  }

  return [...variables];
}

export function renderTemplateString(
  template: string | undefined,
  labels: Record<string, string>,
): RenderTemplateResult {
  const unresolved = new Set<string>();

  const rendered = (template ?? '').replace(
    TEMPLATE_VARIABLE_PATTERN,
    (_full: string, rawKey: string) => {
      const key = rawKey.trim();
      if (!Object.prototype.hasOwnProperty.call(labels, key)) {
        unresolved.add(key);
        return `{{${key}}}`;
      }

      return labels[key] ?? '';
    },
  );

  return {
    rendered,
    unresolvedKeys: [...unresolved],
  };
}

export function generateUniqueSubjectTemplateCopyName(
  originalName: string,
  existingNames: string[],
): string {
  const trimmedName = originalName.trim();
  const normalizedNames = new Set(
    existingNames
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0),
  );

  const base = `${trimmedName} (Copy)`;
  if (!normalizedNames.has(base.toLowerCase())) {
    return base;
  }

  let index = 2;
  while (normalizedNames.has(`${trimmedName} (Copy ${index})`.toLowerCase())) {
    index += 1;
  }

  return `${trimmedName} (Copy ${index})`;
}

export function createSubjectTemplateFormFromTemplate(
  template: SubjectTemplate,
): SubjectTemplateFormData {
  const form = createEmptySubjectTemplateForm();

  form.name = template.name ?? '';
  form.type = template.type ?? SUBJECT_TEMPLATE_TYPES[0];
  form.sourceMode = template.sourceMode ?? SUBJECT_TEMPLATE_SOURCE_MODES[0];
  form.titleTemplate = template.titleTemplate ?? '';
  form.descriptionTemplate = template.descriptionTemplate ?? '';
  form.purposeTemplate = template.purposeTemplate ?? '';
  form.remarksTemplate = template.remarksTemplate ?? '';
  form.identityLabelKeys = [...(template.identityLabelKeys ?? [])];
  form.selectorLabels = (template.selectorLabels ?? []).map(
    (selectorLabel) => ({
      key: selectorLabel.key ?? '',
      value: selectorLabel.value ?? '',
    }),
  );
  form.labelSchema = (template.labelSchema ?? []).map((schemaField) => ({
    key: schemaField.key ?? '',
    description: schemaField.description ?? '',
  }));
  form.props = (template.props ?? []).map((prop) => ({
    uuid: prop.uuid ?? '',
    name: prop.name ?? '',
    value: prop.value ?? '',
    class: prop.class ?? '',
    ns: prop.ns ?? '',
    remarks: prop.remarks ?? '',
  }));
  form.links = (template.links ?? []).map((link) => ({
    href: link.href ?? '',
    rel: link.rel ?? '',
    text: link.text ?? '',
  }));

  return form;
}

function normalizeSelectorLabels(
  selectorLabels: SubjectTemplateSelectorLabelFormRow[],
): SubjectTemplateSelectorLabel[] {
  const normalized: SubjectTemplateSelectorLabel[] = [];

  for (const [index, row] of selectorLabels.entries()) {
    const key = row.key.trim();
    const value = row.value.trim();

    if (!isAnyFilled([key, value])) {
      continue;
    }

    if (!key || !value) {
      throw new Error(
        `Selector label #${index + 1} must include both key and value.`,
      );
    }

    normalized.push({ key, value });
  }

  if (normalized.length === 0) {
    throw new Error('At least one selector label is required.');
  }

  return normalized;
}

function normalizeLabelSchema(
  labelSchema: SubjectTemplateLabelSchemaFormRow[],
): SubjectTemplateLabelSchemaField[] {
  const normalized: SubjectTemplateLabelSchemaField[] = [];

  for (const [index, row] of labelSchema.entries()) {
    const key = row.key.trim();
    const description = toOptionalTrimmed(row.description);

    if (!isAnyFilled([key, description ?? ''])) {
      continue;
    }

    if (!key) {
      throw new Error(`Label schema row #${index + 1} must include a key.`);
    }

    normalized.push({
      key,
      description,
    });
  }

  if (normalized.length === 0) {
    throw new Error('At least one label schema field is required.');
  }

  return normalized;
}

function normalizeProps(props: SubjectTemplatePropertyFormRow[]): Property[] {
  const normalized: Property[] = [];

  for (const [index, propRow] of props.entries()) {
    const uuid = toOptionalTrimmed(propRow.uuid);
    const name = toOptionalTrimmed(propRow.name);
    const value = toOptionalTrimmed(propRow.value);
    const className = toOptionalTrimmed(propRow.class);
    const ns = toOptionalTrimmed(propRow.ns);
    const remarks = toOptionalTrimmed(propRow.remarks);

    if (
      !isAnyFilled([
        uuid ?? '',
        name ?? '',
        value ?? '',
        className ?? '',
        ns ?? '',
        remarks ?? '',
      ])
    ) {
      continue;
    }

    if (!name || !value) {
      throw new Error(
        `Property row #${index + 1} must include both name and value when provided.`,
      );
    }

    normalized.push({
      uuid,
      name,
      value,
      class: className,
      ns,
      remarks,
    });
  }

  return normalized;
}

function normalizeLinks(links: SubjectTemplateLinkFormRow[]): Link[] {
  const normalized: Link[] = [];

  for (const [index, linkRow] of links.entries()) {
    const href = toOptionalTrimmed(linkRow.href);
    const rel = toOptionalTrimmed(linkRow.rel);
    const text = toOptionalTrimmed(linkRow.text);

    if (!isAnyFilled([href ?? '', rel ?? '', text ?? ''])) {
      continue;
    }

    if (!href) {
      throw new Error(`Link row #${index + 1} must include an href.`);
    }

    normalized.push({
      href,
      rel,
      text,
    });
  }

  return normalized;
}

export function buildUpsertSubjectTemplatePayload(
  formData: SubjectTemplateFormData,
): UpsertSubjectTemplateRequest {
  const name = formData.name.trim();
  if (!name) {
    throw new Error('Template name is required.');
  }

  if (!isSubjectTemplateType(formData.type)) {
    throw new Error('Template type is invalid.');
  }

  if (!isSubjectTemplateSourceMode(formData.sourceMode)) {
    throw new Error('Source mode is invalid.');
  }

  const labelSchema = normalizeLabelSchema(formData.labelSchema);
  const selectorLabels = normalizeSelectorLabels(formData.selectorLabels);

  const schemaKeys = new Set(labelSchema.map((field) => field.key));
  const identityLabelKeys = [
    ...new Set(
      formData.identityLabelKeys
        .map((key) => key.trim())
        .filter((key) => key.length > 0),
    ),
  ];

  if (identityLabelKeys.length === 0) {
    throw new Error('At least one identity label key is required.');
  }

  for (const identityLabelKey of identityLabelKeys) {
    if (!schemaKeys.has(identityLabelKey)) {
      throw new Error(
        `Identity label key "${identityLabelKey}" must exist in label schema.`,
      );
    }
  }

  const props = normalizeProps(formData.props);
  const links = normalizeLinks(formData.links);

  return {
    name,
    type: formData.type,
    sourceMode: formData.sourceMode,
    titleTemplate: toOptionalTrimmed(formData.titleTemplate),
    descriptionTemplate: toOptionalTrimmed(formData.descriptionTemplate),
    purposeTemplate: toOptionalTrimmed(formData.purposeTemplate),
    remarksTemplate: toOptionalTrimmed(formData.remarksTemplate),
    identityLabelKeys,
    selectorLabels,
    labelSchema,
    props,
    links,
  };
}
