import type { RouteLocationRaw } from 'vue-router';
import type { IconName } from '../Icon/icons';

/** Entry types for Menu. */
export interface MenuAction {
  type?: 'item';
  label: string;
  icon?: IconName;
  to?: RouteLocationRaw;
  /** The link to the page the user is on (navigation flyouts). */
  current?: boolean;
  tone?: 'danger';
  /** Keeps the item focusable but inert, and shows why. */
  disabledReason?: string;
  onSelect?: () => void;
}

interface MenuSeparator {
  type: 'separator';
}

interface MenuRadio {
  type: 'radio';
  label: string;
  value: string;
  options: { value: string; label: string; icon?: IconName }[];
  onChange: (value: string) => void;
}

export type MenuEntry = MenuAction | MenuSeparator | MenuRadio;

const isDanger = (entry: MenuEntry): boolean =>
  (entry.type ?? 'item') === 'item' && (entry as MenuAction).tone === 'danger';

/**
 * Danger items always go last, after a separator (F-16 AC5), whatever order they were given in.
 * Leading, trailing and doubled separators are dropped.
 */
export function arrange(entries: MenuEntry[]): MenuEntry[] {
  const danger = entries.filter(isDanger);
  const ordered = entries.filter((entry) => !isDanger(entry));
  if (danger.length) ordered.push({ type: 'separator' }, ...danger);
  const result: MenuEntry[] = [];
  for (const entry of ordered) {
    if (
      entry.type === 'separator' &&
      (!result.length || result.at(-1)?.type === 'separator')
    )
      continue;
    result.push(entry);
  }
  if (result.at(-1)?.type === 'separator') result.pop();
  return result;
}
