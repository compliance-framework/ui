// Port of Go's path.Match (src/path/match.go), used for lock hints only (API A1.5, R28):
// `*` and `?` do not cross `/`; `[...]`, `[^...]` and `\` escapes are supported; matching
// is case-sensitive. A malformed pattern never matches. The agent/API are authoritative.

class BadPattern extends Error {}

type Runes = string[];

function scanChunk(pattern: Runes): {
  star: boolean;
  chunk: Runes;
  rest: Runes;
} {
  let star = false;
  while (pattern.length > 0 && pattern[0] === '*') {
    pattern = pattern.slice(1);
    star = true;
  }
  let inrange = false;
  let i = 0;
  scan: for (i = 0; i < pattern.length; i++) {
    switch (pattern[i]) {
      case '\\':
        // Error check handled in matchChunk: bad pattern.
        if (i + 1 < pattern.length) i++;
        break;
      case '[':
        inrange = true;
        break;
      case ']':
        inrange = false;
        break;
      case '*':
        if (!inrange) break scan;
        break;
    }
  }
  return { star, chunk: pattern.slice(0, i), rest: pattern.slice(i) };
}

function getEsc(chunk: Runes): { r: string; rest: Runes } {
  if (chunk.length === 0 || chunk[0] === '-' || chunk[0] === ']') {
    throw new BadPattern();
  }
  if (chunk[0] === '\\') {
    chunk = chunk.slice(1);
    if (chunk.length === 0) throw new BadPattern();
  }
  const r = chunk[0];
  const rest = chunk.slice(1);
  if (rest.length === 0) throw new BadPattern();
  return { r, rest };
}

/** Returns the remaining name on a match, or null. Throws BadPattern. */
function matchChunk(chunk: Runes, s: Runes): Runes | null {
  let failed = false;
  while (chunk.length > 0) {
    if (!failed && s.length === 0) failed = true;
    switch (chunk[0]) {
      case '[': {
        let r = '';
        if (!failed) {
          r = s[0];
          s = s.slice(1);
        }
        chunk = chunk.slice(1);
        let negated = false;
        if (chunk.length > 0 && chunk[0] === '^') {
          negated = true;
          chunk = chunk.slice(1);
        }
        let match = false;
        let nrange = 0;
        for (;;) {
          if (chunk.length > 0 && chunk[0] === ']' && nrange > 0) {
            chunk = chunk.slice(1);
            break;
          }
          const lo = getEsc(chunk);
          chunk = lo.rest;
          let hi = lo.r;
          if (chunk[0] === '-') {
            const h = getEsc(chunk.slice(1));
            hi = h.r;
            chunk = h.rest;
          }
          const cp = r === '' ? 0 : r.codePointAt(0)!;
          if (lo.r.codePointAt(0)! <= cp && cp <= hi.codePointAt(0)!)
            match = true;
          nrange++;
        }
        if (match === negated) failed = true;
        break;
      }
      case '?':
        if (!failed) {
          if (s[0] === '/') failed = true;
          s = s.slice(1);
        }
        chunk = chunk.slice(1);
        break;
      case '\\':
        chunk = chunk.slice(1);
        if (chunk.length === 0) throw new BadPattern();
        if (!failed) {
          if (chunk[0] !== s[0]) failed = true;
          s = s.slice(1);
        }
        chunk = chunk.slice(1);
        break;
      default:
        if (!failed) {
          if (chunk[0] !== s[0]) failed = true;
          s = s.slice(1);
        }
        chunk = chunk.slice(1);
    }
  }
  return failed ? null : s;
}

/**
 * Go path.Match. Returns `{matched, error}` like Go; `error` is true for a malformed
 * pattern (Go's ErrBadPattern).
 */
export function goPathMatch(
  pattern: string,
  name: string,
): { matched: boolean; error: boolean } {
  let pat: Runes = Array.from(pattern);
  let nm: Runes = Array.from(name);
  try {
    outer: while (pat.length > 0) {
      const scanned = scanChunk(pat);
      const { star, chunk } = scanned;
      pat = scanned.rest;
      if (star && chunk.length === 0) {
        // Trailing * matches the rest of the string unless it has a /.
        return { matched: !nm.includes('/'), error: false };
      }
      // Look for a match at the current position.
      const t = matchChunk(chunk, nm);
      if (t !== null && (t.length === 0 || pat.length > 0)) {
        nm = t;
        continue;
      }
      if (star) {
        // Look for a match skipping i+1 runes. Cannot skip /.
        for (let i = 0; i < nm.length && nm[i] !== '/'; i++) {
          const t2 = matchChunk(chunk, nm.slice(i + 1));
          if (t2 !== null) {
            // If we're the last chunk, make sure we exhausted the name.
            if (pat.length === 0 && t2.length > 0) continue;
            nm = t2;
            continue outer;
          }
        }
      }
      // Before returning false, check that the rest of the pattern is valid.
      while (pat.length > 0) {
        const s2 = scanChunk(pat);
        pat = s2.rest;
        matchChunk(s2.chunk, []);
      }
      return { matched: false, error: false };
    }
    return { matched: nm.length === 0, error: false };
  } catch (e) {
    if (e instanceof BadPattern) return { matched: false, error: true };
    throw e;
  }
}

/** path.Match where a malformed pattern means "no match". */
export function pathMatch(pattern: string, name: string): boolean {
  return goPathMatch(pattern, name).matched;
}

/**
 * Mirrors agentconfig.MatchOverridableConfigFlag: an entry containing ':' is
 * "<plugin-glob>:<key-glob>" (split at the FIRST ':'), otherwise "<key-glob>" for any plugin.
 */
export function configKeyOverridable(
  flags: readonly string[],
  plugin: string,
  key: string,
): boolean {
  for (const entry of flags) {
    const idx = entry.indexOf(':');
    const pluginGlob = idx >= 0 ? entry.slice(0, idx) : '*';
    const keyGlob = idx >= 0 ? entry.slice(idx + 1) : entry;
    if (!pathMatch(pluginGlob, plugin)) continue;
    if (pathMatch(keyGlob, key)) return true;
  }
  return false;
}

/** Mirrors agentconfig.MatchTrustedSource. */
export function sourceTrusted(
  globs: readonly string[],
  source: string,
): boolean {
  return globs.some((g) => pathMatch(g, source));
}
