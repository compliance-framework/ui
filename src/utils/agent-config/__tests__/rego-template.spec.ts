import { describe, expect, it } from 'vitest';
import {
  moduleTemplate,
  newModulePolicyId,
  packageForPath,
} from '../rego-template';

describe('module template (R64, R78)', () => {
  it('has the contract fields, never the bare skeleton', () => {
    const t = moduleTemplate('compliance_framework.ssh_banner');
    expect(t).toMatch(/^package compliance_framework\.ssh_banner\n/);
    expect(t).toContain('import rego.v1');
    expect(t).toMatch(/^title := "/m);
    expect(t).toMatch(/^description := "/m);
    // R78: the object form, which every plugin build evaluates (not `violation contains`).
    expect(t).toMatch(/^violation\[\{"id": ".*", "title": ".*"\}\] if \{/m);
    expect(t).not.toContain('violation contains');
    expect(t).toMatch(/^labels := \{\}/m);
    expect(t).not.toMatch(/^policy_id/m);
  });

  it('declares policy_id after the imports when given (R78)', () => {
    const t = moduleTemplate(
      'compliance_framework.x',
      'my-bundle/checks/x.rego',
    );
    expect(t).toMatch(
      /^import rego\.v1\n\npolicy_id := "my-bundle\/checks\/x\.rego"\n\ntitle := /m,
    );
  });

  it('gives a new module the policy_id <bundle>/<file> (R78)', () => {
    expect(newModulePolicyId('ssh-tuned', 'checks/new.rego')).toBe(
      'ssh-tuned/checks/new.rego',
    );
  });

  it('derives a package from the file name and rejects junk packages', () => {
    expect(packageForPath('checks/ssh-banner.rego')).toBe(
      'compliance_framework.ssh_banner',
    );
    expect(packageForPath('1st.rego')).toBe('compliance_framework._1st');
    expect(moduleTemplate('not a package')).toMatch(
      /^package compliance_framework\.policy\n/,
    );
  });
});
