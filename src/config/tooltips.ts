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
    'Link evidence dashboards to automatically track compliance for this control',
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
