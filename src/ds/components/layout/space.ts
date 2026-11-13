/** Spacing steps that layout components accept; each maps to a --space-* token. */
export type SpaceStep =
  '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | 'section';

export function spaceVar(step: SpaceStep): string {
  return `var(--space-${step})`;
}
