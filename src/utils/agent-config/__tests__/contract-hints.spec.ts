import { describe, expect, it } from 'vitest';
import { contractHints } from '../contract-hints';

const HEAD = 'package compliance_framework.ssh\n\nimport rego.v1\n\n';
const codes = (h: ReturnType<typeof contractHints>) =>
  h.map((x) => `${x.code}:${x.severity}:${x.row}`);

describe('contractHints (R63, client mirror)', () => {
  it('flags a body-less override: no title (error) and no violation (warning)', () => {
    const h = contractHints('b', { 'ssh.rego': HEAD });
    expect(codes(h)).toEqual([
      'missing-title:error:1',
      'missing-violation:warning:1',
    ]);
    expect(h.every((x) => x.client && x.bundle === 'b')).toBe(true);
  });

  it('downgrades a missing title to a warning for partial bundles', () => {
    const h = contractHints('b', { 'ssh.rego': HEAD }, { incomplete: true });
    expect(codes(h)[0]).toBe('missing-title:warning:1');
  });

  it('lets an inherited vendor module of the package complete it, but warns about duplicates', () => {
    const h = contractHints(
      'b',
      { 'extra.rego': HEAD },
      {
        inherited: [{ path: 'ssh.rego', package: 'compliance_framework.ssh' }],
      },
    );
    expect(codes(h)).toEqual(['duplicate-package-module:warning:1']);
  });

  it('checks contract key shapes and literal types with positions', () => {
    const src =
      HEAD +
      'title(x) := "t"\n' + // 5
      'description contains "d" if { true }\n' + // 6
      'remarks := 3\n' + // 7
      'labels := "x"\n' + // 8
      'violation[k] := v if { k := 1; v := 2 }\n'; // 9
    expect(codes(contractHints('b', { 'ssh.rego': src }))).toEqual([
      'contract-key-function:error:5',
      'contract-key-multi-value:error:6',
      'invalid-type:error:7',
      'invalid-type:error:8',
      'invalid-violation-rule:error:9',
      'missing-title:error:1',
    ]);
  });

  it('accepts multi-line objects, conditional titles with a default, and comments', () => {
    const src =
      HEAD +
      'default title := "x"\n' +
      'title := "y" if { input.a }\n' +
      'labels := {\n  "a": "b",\n}\n' +
      '# title := 1\n' +
      'violation contains {"id": "a"} if { input.b }\n';
    expect(contractHints('b', { 'ssh.rego': src })).toEqual([]);
  });

  it('warns about conditional-only and empty titles', () => {
    expect(
      codes(
        contractHints('b', {
          'a.rego':
            HEAD +
            'title := "x" if { input.a }\nviolation contains {} if { false }\n',
        }),
      ),
    ).toEqual(['conditional-title:warning:5']);
    expect(
      codes(
        contractHints('b', {
          'a.rego': HEAD + 'title := ""\nviolation contains {} if { false }\n',
        }),
      ),
    ).toEqual(['empty-title:warning:5']);
  });

  it('parse-level hints: rego.v1 import, namespace, forbidden builtins; tests skip the contract', () => {
    const h = contractHints('b', {
      'lib.rego': 'package helpers\n\nx := http.send({})\n',
      'a_test.rego': 'package compliance_framework.a_test\n\nimport rego.v1\n',
    });
    expect(codes(h)).toEqual([
      'missing-rego-v1-import:warning:1',
      'package-namespace:warning:1',
      'forbidden-builtin:error:3',
    ]);
    expect(h[2].col).toBe(6);
  });
});
