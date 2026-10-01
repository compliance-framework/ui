// R74/R78: policy_id declarations of policy modules (design §13.4).
import { describe, expect, it } from 'vitest';
import { newModulePolicyId, policyIdRules } from '../policy-identity';

describe('newModulePolicyId (R78)', () => {
  it('is <bundle>/<file>', () => {
    expect(newModulePolicyId('ssh-tuned', 'checks/new.rego')).toBe(
      'ssh-tuned/checks/new.rego',
    );
  });
});

describe('reading policy_id', () => {
  it('reads the declared literal', () => {
    const literals = (src: string) => policyIdRules(src).map((r) => r.literal);
    expect(literals('package a\npolicy_id := "x/y.rego"\n')).toEqual([
      'x/y.rego',
    ]);
    expect(literals('package a\npolicy_id = `raw`\n')).toEqual(['raw']);
    expect(literals('package a\npolicy_id := "a" # note\n')).toEqual(['a']);
    expect(literals('package a\n\ntitle := "t"\n')).toEqual([]);
    expect(literals('package a\npolicy_id := "a"\npolicy_id := "b"\n')).toEqual(
      ['a', 'b'],
    );
  });

  it('flags every shape the contract rejects', () => {
    const problems = (src: string) =>
      policyIdRules(src).map((r) => r.problem !== '');
    expect(problems('policy_id := "ok"')).toEqual([false]);
    expect(problems('policy_id := ""')).toEqual([true]);
    expect(problems(`policy_id := "${'x'.repeat(513)}"`)).toEqual([true]);
    expect(problems('policy_id := 42')).toEqual([true]);
    expect(problems('policy_id := concat("/", ["a", "b"])')).toEqual([true]);
    expect(problems('policy_id := "a" if { input.x }')).toEqual([true]);
    expect(problems('default policy_id := "a"')).toEqual([true]);
    expect(problems('policy_id contains "a" if { true }')).toEqual([true]);
    expect(problems('policy_id(x) := x')).toEqual([true]);
    // Indented lines are rule bodies, not heads.
    expect(policyIdRules('  policy_id := 1')).toEqual([]);
  });
});
