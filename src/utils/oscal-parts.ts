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
 * has one. A placeholder for a parameter it doesn't know stays as its ID in brackets.
 */
export function insertParams(text: string, params: Parameter[] = []): string {
  const byId = new Map(params.map((p) => [p.id, p]));
  const write = (s: string, depth: number): string =>
    s.replace(INSERT, (_, id: string) => {
      const param = byId.get(id);
      if (!param || depth > 3) return `[${id}]`;
      if (param.values?.length) return param.values.join(', ');
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
