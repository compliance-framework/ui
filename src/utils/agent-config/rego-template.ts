// The Rego module template (R64): what Override starts from when the vendor source is not
// available, and what "Add file" creates. It satisfies the policy contract (R63) as written:
// a string title and description, a violation set of objects with string id/title, and a
// labels object, so an unedited template compiles and produces evidence (never a violation).

/** Rego package names: dot-separated identifiers. */
const PACKAGE_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/** The package a new module at `path` gets: compliance_framework.<file stem>. */
export function packageForPath(path: string): string {
  const file = path.slice(path.lastIndexOf('/') + 1);
  const stem = file
    .replace(/\.rego$/, '')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^([0-9])/, '_$1');
  return `compliance_framework.${stem || 'policy'}`;
}

/** The module template for package `pkg` (falls back to compliance_framework.policy). */
export function moduleTemplate(pkg: string): string {
  const name = PACKAGE_RE.test(pkg) ? pkg : 'compliance_framework.policy';
  return `package ${name}

import rego.v1

title := "TODO: what this policy checks"
description := "TODO: why it matters and how to fix a violation"

violation contains {"id": "TODO-id", "title": "TODO: what is wrong"} if {
\t# TODO: the conditions under which the input is non-compliant
\tfalse
}

labels := {}
`;
}
