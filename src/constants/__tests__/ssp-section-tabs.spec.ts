import { describe, expect, it } from 'vitest';
import { sspSectionTabRoutes } from '../ssp-section-tabs';

describe('sspSectionTabRoutes', () => {
  it('gives the SSP Editor every section, Risks and Compliance included', () => {
    expect(
      sspSectionTabRoutes('system-security-plan-').map((tab) => tab.label),
    ).toEqual([
      'Overview',
      'Characteristics',
      'Authorization Boundary',
      'Components',
      'Risks',
      'Compliance',
      'JSON',
    ]);
  });

  it('leaves Risks and Compliance out of Configure System', () => {
    const tabs = sspSectionTabRoutes('system:', { includeEditorOnly: false });

    expect(tabs.map((tab) => tab.label)).toEqual([
      'Overview',
      'Characteristics',
      'Authorization Boundary',
      'Components',
      'JSON',
    ]);
    expect(tabs[0].route).toBe('system:overview');
  });
});
