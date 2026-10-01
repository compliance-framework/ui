// Policy identity of policy modules (design §13.4: R74 policy_id, R78 new-module ids).
//
// A module may declare `policy_id := "<string>"` so its evidence stream follows the policy
// instead of its location. Which stream a module writes to is decided by the agent (and
// reported back as policy errors); the UI only reads the declarations for its contract hints
// and gives new modules a stable id.
//
// ADVISORY: like contract-hints, policy_id rules are read line by line, never by parsing Rego.

/** api policyeval.MaxPolicyIDLength (characters). */
export const MAX_POLICY_ID_LENGTH = 512;

/** The policy_id a new module gets (R78): `<bundle>/<file>`, stable from day one. */
export function newModulePolicyId(bundle: string, file: string): string {
  return `${bundle}/${file}`;
}

// ---- Reading a module (line based) ----

/** Removes a trailing `# comment` outside double-quoted strings. */
function stripComment(line: string): string {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && inString) {
      i++;
      continue;
    }
    if (c === '"') inString = !inString;
    else if (c === '#' && !inString) return line.slice(0, i);
  }
  return line;
}

/** A top-level `policy_id` rule head. */
export interface PolicyIdRule {
  row: number;
  col: number;
  /** The literal string value when the rule is `policy_id := "<literal>"`, else null. */
  literal: string | null;
  /** Why the rule is not a valid policy_id declaration ('' when it is). */
  problem: string;
}

const POLICY_ID_SHAPE = 'declare it as `policy_id := "..."`';

function parseStringLiteral(v: string): string | null {
  const s = v.trim();
  if (/^"(?:[^"\\]|\\.)*"$/.test(s)) {
    try {
      return JSON.parse(s) as string;
    } catch {
      return null;
    }
  }
  const raw = /^`([^`]*)`$/.exec(s);
  return raw ? raw[1] : null;
}

/** Every top-level (column 1) `policy_id` rule head of a module. */
export function policyIdRules(src: string): PolicyIdRule[] {
  const out: PolicyIdRule[] = [];
  src.split('\n').forEach((raw, idx) => {
    const line = stripComment(raw).replace(/\s+$/, '');
    const m = /^(default\s+)?policy_id\b(.*)$/.exec(line);
    if (!m) return;
    const rest = m[2];
    const row = idx + 1;
    const col = 1;
    if (m[1]) {
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must not be a default rule; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    const assign = /^\s*(:=|=(?!=))\s*(.*)$/.exec(rest);
    if (!assign) {
      // policy_id(x), policy_id[k], policy_id contains, policy_id if { … }
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must be a single string; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    const value = assign[2];
    if (/\bif\b|\{\s*$/.test(value.replace(/"(?:[^"\\]|\\.)*"/g, '""'))) {
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must be unconditional, since it decides which evidence stream the policy writes to; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    const literal = parseStringLiteral(value);
    if (literal === null) {
      out.push({
        row,
        col,
        literal: null,
        problem: `policy_id must be a string literal; ${POLICY_ID_SHAPE}`,
      });
      return;
    }
    let problem = '';
    if (literal === '') problem = 'policy_id must not be empty';
    else if (Array.from(literal).length > MAX_POLICY_ID_LENGTH)
      problem = `policy_id must be at most ${MAX_POLICY_ID_LENGTH} characters`;
    out.push({ row, col, literal, problem });
  });
  return out;
}
