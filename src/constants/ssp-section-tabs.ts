// The top-level sections of a System Security Plan, shared by the two pages that browse
// them: Configure System (route names prefixed `system:`, scoped to the active SSP) and the
// SSP Editor (route names prefixed `system-security-plan-`, scoped to the `:id` route param).
// Both route trees register a child route named `<prefix><suffix>` for every entry they
// show, so the two pages' tab bars stay in step by construction instead of by two
// hand-kept lists.
export interface SspSectionTab {
  label: string;
  suffix: string;
  // Sections the active system reaches from the left nav instead (This System > Risks,
  // This System > Compliance). Configure System leaves these out so the same page isn't
  // reachable from two places; the SSP Editor, which browses any SSP, keeps them.
  editorOnly?: boolean;
}

export const SSP_SECTION_TABS: SspSectionTab[] = [
  { label: 'Overview', suffix: 'overview' },
  { label: 'Characteristics', suffix: 'characteristics' },
  { label: 'Authorization Boundary', suffix: 'diagrams' },
  // { label: 'System Implementation', suffix: 'implementation' },
  // { label: 'Users', suffix: 'users' },
  { label: 'Components', suffix: 'components' },
  { label: 'Scope', suffix: 'scope' },
  // { label: 'Leveraged Authorizations', suffix: 'authorizations' },
  // { label: 'Control Implementation', suffix: 'control-implementation' },
  // { label: 'Export Offerings', suffix: 'export-offerings' },
  // { label: 'Leverage', suffix: 'leverage' },
  // { label: 'Inherited Capabilities', suffix: 'inherited-capabilities' },
  { label: 'Risks', suffix: 'risks', editorOnly: true },
  { label: 'Compliance', suffix: 'compliance', editorOnly: true },
  { label: 'JSON', suffix: 'json' },
];

export function sspSectionTabRoutes(
  prefix: string,
  options: { includeEditorOnly?: boolean } = {},
) {
  const includeEditorOnly = options.includeEditorOnly ?? true;
  return SSP_SECTION_TABS.filter(
    (tab) => includeEditorOnly || !tab.editorOnly,
  ).map((tab) => ({
    label: tab.label,
    route: `${prefix}${tab.suffix}`,
  }));
}
