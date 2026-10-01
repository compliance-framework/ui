import { describe, expect, it } from 'vitest';
import { moduleTemplate, packageForPath } from '../rego-template';
import { contractHints } from '../contract-hints';

describe('module template (R64)', () => {
  it('has the contract fields, never the bare skeleton', () => {
    const t = moduleTemplate('compliance_framework.ssh_banner');
    expect(t).toMatch(/^package compliance_framework\.ssh_banner\n/);
    expect(t).toContain('import rego.v1');
    expect(t).toMatch(/^title := "/m);
    expect(t).toMatch(/^description := "/m);
    expect(t).toMatch(
      /^violation contains \{"id": ".*", "title": ".*"\} if \{/m,
    );
    expect(t).toMatch(/^labels := \{\}/m);
  });

  it('satisfies the client contract hints as written', () => {
    const t = moduleTemplate('compliance_framework.x');
    expect(contractHints('b', { 'x.rego': t })).toEqual([]);
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
