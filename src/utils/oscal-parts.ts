import type { Parameter, Part } from '@/oscal';

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

const INSERT = /\{\{\s*insert:\s*param,\s*([^\s}]+)\s*\}\}/g;

/**
 * Text with its parameter placeholders (`{{ insert: param, ac-02_odp.01 }}`) written out as NIST
 * prints them: "[Assignment: organization-defined prerequisites and criteria]" for a parameter
 * with a label, "[Selection (one or more): a; b]" for a choice, or the parameter's value when it
 * has one, marked "--like this--". A placeholder for a parameter it doesn't know stays as its ID in brackets.
 */
export function insertParams(text: string, params: Parameter[] = []): string {
  const byId = new Map(params.map((p) => [p.id, p]));
  const write = (s: string, depth: number): string =>
    s.replace(INSERT, (_, id: string) => {
      const param = byId.get(id);
      if (!param || depth > 3) return `[${id}]`;
      // A set value is marked, so it reads as filled in rather than as the control's own words.
      if (param.values?.length) return `--${param.values.join(', ')}--`;
      if (param.select?.choice?.length) {
        const how =
          param.select.howMany === 'one-or-more' ? ' (one or more)' : '';
        const choices = param.select.choice.map((c) =>
          write(c, depth + 1).trim(),
        );
        return `[Selection${how}: ${choices.join('; ')}]`;
      }
      return `[Assignment: organization-defined ${param.label ?? id}]`;
    });
  return write(text, 0);
}

/** One labelled item of a part (see `partOutline`), with the part's ID. */
export interface PartOutlineItem {
  id: string;
  label: string;
  text: string;
  items: PartOutlineItem[];
}

/**
 * A part's sub-parts as an outline, at every depth: each with its label ("a."), prose and ID, so
 * a statement shows the items an implementation's statements are written against. Sub-parts with
 * neither label nor prose are skipped in favour of their own sub-parts.
 */
export function partOutline(part: Part): PartOutlineItem[] {
  return (part.parts ?? []).flatMap((child) => {
    const items = partOutline(child);
    const label = partLabel(child);
    if (!label && !child.prose) return items;
    return [{ id: child.id ?? '', label, text: child.prose ?? '', items }];
  });
}
