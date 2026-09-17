// The top-level sections of a System Security Plan, shared by the two pages that browse
// them: the System page (route names prefixed `system:`, scoped to the active SSP) and the
// SSP Editor (route names prefixed `system-security-plan-`, scoped to the `:id` route param).
// Both route trees register a child route named `<prefix><suffix>` for every entry here, so
// the two pages' tab bars stay identical by construction instead of by two hand-kept lists.
export interface SspSectionTab {
  label: string;
  suffix: string;
}

export const SSP_SECTION_TABS: SspSectionTab[] = [
  { label: 'Overview', suffix: 'overview' },
  { label: 'System Characteristics', suffix: 'characteristics' },
  { label: 'System Implementation', suffix: 'implementation' },
  { label: 'Users', suffix: 'users' },
  { label: 'Components', suffix: 'components' },
  { label: 'Leveraged Authorizations', suffix: 'authorizations' },
  { label: 'Control Implementation', suffix: 'control-implementation' },
  { label: 'Export Offerings', suffix: 'export-offerings' },
  { label: 'Leverage', suffix: 'leverage' },
  { label: 'Inherited Capabilities', suffix: 'inherited-capabilities' },
  { label: 'Risks', suffix: 'risks' },
  { label: 'Compliance', suffix: 'compliance' },
  { label: 'JSON', suffix: 'json' },
];

export function sspSectionTabRoutes(prefix: string) {
  return SSP_SECTION_TABS.map((tab) => ({
    label: tab.label,
    route: `${prefix}${tab.suffix}`,
  }));
}
