/**
 * Centralized Tooltip Configuration
 *
 * This file contains all tooltip text definitions used throughout the application.
 * To add a new tooltip:
 * 1. Add a new key-value pair to the TOOLTIPS object below
 * 2. Use the TooltipTitle component with the tooltip-key prop instead of tooltip-text
 *
 * Example:
 * <TooltipTitle text="My Title" tooltip-key="my.tooltip.key" />
 */

export const TOOLTIPS = {
  // Control Implementation
  'control.implementation.statement':
    'Control Statement is how you are defining this control is implemented for your System. It contains a description of how this specific control / statement is performed, and allows you to link Components and backing Evidence',
  'control.implementation.components':
    'System components that implement this control statement',
  'control.implementation.evidence':
    'Link evidence filters to automatically track compliance for this control',
  'control.implementation.title': '', // TODO: Add tooltip
  'control.implementation.requirements': '', // TODO: Add tooltip

  // System Security Plan
  'ssp.characteristics': '', // TODO: Add tooltip
  'ssp.json.view': '', // TODO: Add tooltip
  'ssp.control.implementation': '', // TODO: Add tooltip
  'ssp.system.implementation': '', // TODO: Add tooltip

  // System
  'system.users': 'Users who have access to or operate this system',
  'system.components': '', // TODO: Add tooltip
  'system.authorizations':
    'External systems or services this system relies on for authorization',
  'system.compliance':
    'Current compliance progress for the selected system profile',
  'system.implementation.statement.drawer':
    'Define how this control is implemented in your system',

  // Assessment Plans
  'assessment.tasks': '', // TODO: Add tooltip

  // Risks & POA&M
  'risks.list': '', // TODO: Add tooltip

  // Statement Details (field labels)
  'statement.id': '', // TODO: Add tooltip
  'statement.remarks': '', // TODO: Add tooltip
  'statement.description': '', // TODO: Add tooltip
  'statement.props': '', // TODO: Add tooltip
  'statement.links': '', // TODO: Add tooltip

  // Agent configuration
  'agents.config.field.forbidden':
    'Set on the agent host; can never be changed remotely',
  'agents.config.instance.oneShot':
    'Runs once and exits; pruned 24 h after it was last seen',
  'agents.config.instance.truncated':
    "The agent's report exceeded the size limit, so its local file was dropped: the File view and the checks against this host's file are unavailable",
  'agents.config.instance.fileWarnings':
    "Problems in this agent's local file (tolerated; the affected plugins are skipped)",
  'agents.config.policyData.masked':
    'Masked in the report: the host keeps its value unless you set a new one',
  'agents.config.policyData.env':
    '${env:…} is resolved only in plugin config values: here it is a literal string, and the API rejects new references in policy_data',
  'agents.config.policyData.maskedList':
    'Holds masked values: a list is saved whole, which would copy the masks. Edit it in the raw JSON view and retype the masked values, or remove the whole list.',
  /** Followed by the reported library version. */
  'agents.config.plugin.libVersion': 'Built on agent library',
  'agents.config.field.resetToFile': 'Reset to file value',
  'agents.config.plugin.configKeyCase':
    "The agent lowercases and dot-splits keys that come from its file, and globs match case-sensitively; this key may not match the file's key",

  // Add more tooltips here as needed
  // 'feature.name': 'Tooltip text here',
} as const;

export type TooltipKey = keyof typeof TOOLTIPS;

/**
 * Get tooltip text by key
 * @param key - The tooltip key
 * @returns The tooltip text or undefined if not found
 */
export function getTooltipText(key: string): string | undefined {
  return TOOLTIPS[key as TooltipKey];
}
