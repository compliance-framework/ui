import type { Part } from '@/oscal';

/** A part's `label` prop, e.g. "a." for a statement item. */
export function partLabel(part: Part): string {
  return part.props?.find((prop) => prop.name === 'label')?.value ?? '';
}

/**
 * A part and its sub-parts as indented markdown lines ("a. Prose…"), as catalogs show statements,
 * objectives and guidance. Parts with neither label nor prose only contribute their children.
 */
export function partMarkdown(part: Part, depth = 0): string {
  const label = partLabel(part);
  const children = (part.parts ?? [])
    .map((child) =>
      partMarkdown(child, child.prose || partLabel(child) ? depth + 1 : depth),
    )
    .join('');
  if (!label && !part.prose) return children;
  return `${'  '.repeat(depth)}${label ? `${label} ` : ''}${part.prose ?? ''}\n${children}`;
}
