// Light, line-based mirror of the policy contract checks (R63: api pkg/policyeval
// CheckContract + regocheck's parse-level warnings) for modules authored in the browser.
// ADVISORY ONLY: it never parses Rego. It looks at top-level rule heads (column 1) so that a
// missing `title`, a contract key defined as a function, or a literal of the wrong type shows
// up while typing. The API preview (static checks) and the agent (compile, tests, dry run)
// stay authoritative; their PolicyErrors are shown next to these hints.
//
// Codes are the API's, so the UI labels them the same way (POLICY_ERROR_CODE_LABELS).

import type { PolicyError } from '@/types/agent-config';
import { FORBIDDEN_BUILTINS } from './validation';

/** A browser-side hint; same shape as an API PolicyError plus a marker. */
export type ContractHint = PolicyError & { client: true };

/** A vendor module the bundle still inherits (not overridden, not deleted). */
export interface InheritedModule {
  path: string;
  package?: string;
}

export interface ContractHintOptions {
  /**
   * The bundle extends a source (or is otherwise partial): package-level gaps (missing title)
   * are warnings, as on the API (regocheck `completable`).
   */
  incomplete?: boolean;
  /** Vendor modules the bundle still inherits; they may complete or duplicate a package. */
  inherited?: InheritedModule[];
}

const POLICY_ROOT = 'compliance_framework';
const ALLOWED_ROOTS = ['compliance_framework', 'ccf_libs'];
const TEXT_KEYS = ['title', 'description', 'remarks', 'skip_reason'];
const CONTRACT_KEYS = [...TEXT_KEYS, 'labels', 'risk_templates'];

interface Head {
  name: string;
  row: number;
  col: number;
  isDefault: boolean;
  /** `(` right after the name: a function. */
  fn: boolean;
  /** `name[` : an object/partial rule with a key. */
  bracket: boolean;
  contains: boolean;
  /** Text after `:=` / `=` on the head line, trimmed (null when not an assignment). */
  value: string | null;
  /** The head has an `if` / body (conditional). */
  conditional: boolean;
}

interface ParsedModule {
  path: string;
  pkg: string | null;
  pkgRow: number;
  importsRegoV1: boolean;
  heads: Head[];
  builtins: { row: number; col: number; name: string }[];
}

/** Removes a trailing `# comment` that is not inside a string. */
function stripComment(line: string): string {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && inString) {
      i++;
      continue;
    }
    if (c === '"') inString = !inString;
    else if (c === '`') {
      const end = line.indexOf('`', i + 1);
      if (end < 0) return line;
      i = end;
    } else if (c === '#' && !inString) return line.slice(0, i);
  }
  return line;
}

const HEAD_RE =
  /^(default\s+)?([A-Za-z_][A-Za-z0-9_]*)(\s*\(|\s*\[|\s+contains\b|\s*:=|\s*=(?!=)|\s+if\b|\s*\{)/;

function parseModule(path: string, src: string): ParsedModule {
  const lines = src.split('\n');
  const out: ParsedModule = {
    path,
    pkg: null,
    pkgRow: 1,
    importsRegoV1: false,
    heads: [],
    builtins: [],
  };
  lines.forEach((raw, idx) => {
    const row = idx + 1;
    const line = stripComment(raw);
    const pkg = /^\s*package\s+([A-Za-z0-9_.[\]"]+)/.exec(line);
    if (pkg && out.pkg === null) {
      out.pkg = pkg[1];
      out.pkgRow = row;
      return;
    }
    if (/^\s*import\s+rego\.v1\s*$/.test(line)) {
      out.importsRegoV1 = true;
      return;
    }
    const re = new RegExp(FORBIDDEN_BUILTINS.source, 'g');
    for (const m of line.matchAll(re)) {
      out.builtins.push({ row, col: (m.index ?? 0) + 1, name: m[1] });
    }
    const h = HEAD_RE.exec(line);
    if (!h || h[2] === 'package' || h[2] === 'import') return;
    const op = h[3].trim();
    const rest = line.slice(h[0].length);
    const value = op === ':=' || op === '=' ? rest.trim() : null;
    out.heads.push({
      name: h[2],
      row,
      col: (h[1]?.length ?? 0) + 1,
      isDefault: !!h[1],
      fn: op === '(',
      bracket: op === '[',
      contains: op === 'contains',
      value,
      conditional: op === 'if' || op === '{' || /\bif\b/.test(rest),
    });
  });
  return out;
}

function underRoot(pkg: string, roots: string[]): boolean {
  return roots.some((r) => pkg === r || pkg.startsWith(`${r}.`));
}

/** A literal's JSON-ish kind from the first characters of a rule value, or null if computed. */
function literalKind(
  value: string,
):
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'array'
  | 'object'
  | 'set'
  | null {
  const v = value.trim();
  if (/^"/.test(v) || /^`/.test(v)) return 'string';
  if (/^-?\d/.test(v)) return 'number';
  if (/^(true|false)\b/.test(v)) return 'boolean';
  if (/^null\b/.test(v)) return 'null';
  if (/^\[/.test(v)) return 'array';
  if (/^set\(\)/.test(v)) return 'set';
  // A brace that opens a multi-line value is not judged here.
  if (/^\{\s*$/.test(v)) return null;
  if (/^\{\s*\}/.test(v)) return 'object';
  if (/^\{[^}|]*:/.test(v)) return 'object';
  if (/^\{/.test(v)) return 'set';
  return null;
}

/**
 * Contract hints for one bundle's modules (path → source). Only `.rego` modules are read;
 * `_test.rego` files are never evaluated as policies, so only the parse-level hints apply to
 * them.
 */
export function contractHints(
  bundle: string,
  modules: Record<string, string>,
  opts: ContractHintOptions = {},
): ContractHint[] {
  const out: ContractHint[] = [];
  const push = (
    path: string,
    row: number,
    col: number,
    severity: 'error' | 'warning',
    code: string,
    message: string,
  ) =>
    out.push({ bundle, path, row, col, severity, code, message, client: true });

  const parsed = Object.entries(modules)
    .filter(([p, src]) => p.endsWith('.rego') && typeof src === 'string')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, src]) => parseModule(p, src));

  // Parse-level (regocheck) hints, every module.
  for (const m of parsed) {
    if (!m.pkg) continue; // validation.ts reports the missing package line
    if (!m.importsRegoV1) {
      push(
        m.path,
        m.pkgRow,
        1,
        'warning',
        'missing-rego-v1-import',
        'The module does not `import rego.v1`; plugins built against OPA v0 would parse it as Rego v0',
      );
    }
    if (!underRoot(m.pkg, ALLOWED_ROOTS)) {
      push(
        m.path,
        m.pkgRow,
        1,
        'warning',
        'package-namespace',
        `package ${m.pkg} is not under compliance_framework or ccf_libs`,
      );
    }
    for (const b of m.builtins) {
      push(
        m.path,
        b.row,
        b.col,
        'error',
        'forbidden-builtin',
        `${b.name} is not allowed: agents refuse to run policies that call it`,
      );
    }
  }

  // Contract (policyeval.CheckContract), per policy package of non-test modules.
  const byPkg = new Map<string, ParsedModule[]>();
  for (const m of parsed) {
    if (!m.pkg || m.path.endsWith('_test.rego')) continue;
    if (!underRoot(m.pkg, [POLICY_ROOT])) continue;
    byPkg.set(m.pkg, [...(byPkg.get(m.pkg) ?? []), m]);
  }
  for (const [pkg, mods] of byPkg) {
    const inherited = (opts.inherited ?? []).filter(
      (v) =>
        v.package === pkg &&
        !v.path.endsWith('_test.rego') &&
        !mods.some((m) => m.path === v.path),
    );
    const first = mods[0];
    const heads = mods.flatMap((m) => m.heads.map((h) => ({ m, h })));

    for (const { m, h } of heads) {
      if (h.name === 'violation') {
        if (h.fn) {
          push(
            m.path,
            h.row,
            h.col,
            'error',
            'contract-key-function',
            'violation is defined as a function; it must be a set of objects (`violation contains {…} if …`)',
          );
        } else if (h.bracket) {
          push(
            m.path,
            h.row,
            h.col,
            'error',
            'invalid-violation-rule',
            'violation is an object rule; it must be a set of objects (`violation contains {…} if …`)',
          );
        } else if (h.value !== null) {
          const kind = literalKind(h.value);
          if (kind && kind !== 'set' && kind !== 'array') {
            push(
              m.path,
              h.row,
              h.col,
              'error',
              'invalid-violation-rule',
              'violation must be a collection of objects',
            );
          }
        }
        continue;
      }
      if (!CONTRACT_KEYS.includes(h.name)) continue;
      if (h.fn) {
        push(
          m.path,
          h.row,
          h.col,
          'error',
          'contract-key-function',
          `${h.name} is defined as a function; the agent reads it as a value`,
        );
        continue;
      }
      if (h.contains || h.bracket) {
        push(
          m.path,
          h.row,
          h.col,
          'error',
          'contract-key-multi-value',
          `${h.name} is defined as a multi-value rule; it must be a single value`,
        );
        continue;
      }
      if (h.value === null) continue;
      const kind = literalKind(h.value);
      if (!kind) continue;
      const want = TEXT_KEYS.includes(h.name)
        ? 'string'
        : h.name === 'labels'
          ? 'object'
          : 'array';
      if (kind !== want) {
        push(
          m.path,
          h.row,
          h.col,
          'error',
          'invalid-type',
          `${h.name} must be ${want === 'object' ? 'an object of strings' : `a ${want}`}`,
        );
      } else if (h.name === 'title' && /^""/.test(h.value.trim())) {
        push(
          m.path,
          h.row,
          h.col,
          'warning',
          'empty-title',
          'title is empty; the evidence has no title',
        );
      }
    }

    // Package-level gaps. Inherited vendor modules of the package may supply them.
    if (inherited.length === 0) {
      const titles = heads.filter(({ h }) => h.name === 'title' && !h.fn);
      if (!titles.length) {
        const incomplete = !!opts.incomplete;
        push(
          first.path,
          first.pkgRow,
          1,
          incomplete ? 'warning' : 'error',
          'missing-title',
          `package ${pkg} has no title, so it produces no evidence` +
            (incomplete
              ? ' (a warning only: the extended source may define it)'
              : ''),
        );
      } else if (titles.every(({ h }) => h.conditional && !h.isDefault)) {
        push(
          titles[0].m.path,
          titles[0].h.row,
          titles[0].h.col,
          'warning',
          'conditional-title',
          'every title rule has a condition and there is no default, so the package may have no title',
        );
      }
      if (!heads.some(({ h }) => h.name === 'violation')) {
        push(
          first.path,
          first.pkgRow,
          1,
          'warning',
          'missing-violation',
          `package ${pkg} has no violation rule, so it is always satisfied`,
        );
      }
    }
    const nonTest = mods.length + inherited.length;
    if (nonTest > 1) {
      const paths = [
        ...mods.map((m) => m.path),
        ...inherited.map((v) => v.path),
      ];
      for (const m of mods) {
        push(
          m.path,
          m.pkgRow,
          1,
          'warning',
          'duplicate-package-module',
          `package ${pkg} is defined by ${nonTest} modules (${paths.join(', ')}); each produces its own evidence`,
        );
      }
    }
  }
  return out;
}
