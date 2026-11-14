import { describe, expect, it } from 'vitest';
import type { RiskTemplate } from '@/types/risk-templates';
import {
  duplicateRiskTemplateRequest,
  emptyRiskTemplateForm,
  riskTemplateFormFrom,
  riskTemplateRequest,
} from '../riskTemplateRequest';

const template: RiskTemplate = {
  id: 'template-1',
  pluginId: '  plugin-a ',
  policyPackage: 'policy-a ',
  name: ' network-risk',
  title: ' Network Risk ',
  statement: ' Network risk statement ',
};

describe('riskTemplateRequest', () => {
  it('leaves optional fields unset when only the required ones are given', () => {
    const form = {
      ...emptyRiskTemplateForm(),
      pluginId: 'p',
      policyPackage: 'pkg',
      name: 'n',
      title: 't',
      statement: 's',
    };
    expect(riskTemplateRequest(form)).toEqual({
      pluginId: 'p',
      policyPackage: 'pkg',
      name: 'n',
      title: 't',
      statement: 's',
      likelihoodHint: undefined,
      impactHint: undefined,
      violationIds: undefined,
      threatIds: undefined,
      remediationTemplate: undefined,
      isActive: undefined,
    });
  });

  it('numbers remediation tasks from 1 after dropping blank ones', () => {
    const form = {
      ...emptyRiskTemplateForm(),
      enableRemediation: true,
      remediationTitle: 'Fix it',
      remediationTasks: [{ title: ' A ' }, { title: '  ' }, { title: 'B' }],
    };
    expect(riskTemplateRequest(form).remediationTemplate).toEqual({
      title: 'Fix it',
      description: undefined,
      tasks: [
        { title: 'A', orderIndex: 1 },
        { title: 'B', orderIndex: 2 },
      ],
    });
  });

  it('asks for a remediation title when remediation is included', () => {
    const form = { ...emptyRiskTemplateForm(), enableRemediation: true };
    expect(() => riskTemplateRequest(form)).toThrow('remediation title');
  });

  it('round-trips a saved template through the form', () => {
    const form = riskTemplateFormFrom({
      ...template,
      violationIds: ['SV-1'],
      isActive: false,
    });
    expect(form.violationIds).toEqual([{ id: 'SV-1' }]);
    expect(riskTemplateRequest(form)).toMatchObject({
      violationIds: ['SV-1'],
      isActive: false,
    });
  });
});

describe('duplicateRiskTemplateRequest', () => {
  it('trims the required fields and marks the copy', () => {
    expect(duplicateRiskTemplateRequest(template)).toMatchObject({
      pluginId: 'plugin-a',
      policyPackage: 'policy-a',
      name: 'network-risk-copy',
      title: 'Network Risk (Copy)',
      statement: 'Network risk statement',
    });
  });

  it('renumbers remediation tasks, dropping blank ones', () => {
    const request = duplicateRiskTemplateRequest({
      ...template,
      remediationTemplate: {
        title: 'Remediation',
        description: '   ',
        tasks: [
          { title: '  Task A  ' },
          { title: '   ', orderIndex: 55 },
          { title: 'Task B', orderIndex: 99 },
        ],
      },
    });
    expect(request.remediationTemplate).toEqual({
      title: 'Remediation',
      description: undefined,
      tasks: [
        { title: 'Task A', orderIndex: 1 },
        { title: 'Task B', orderIndex: 2 },
      ],
    });
  });

  it('normalizes threat IDs and drops empty ones', () => {
    const request = duplicateRiskTemplateRequest({
      ...template,
      threatIds: [
        { system: ' MITRE ', id: ' T1 ', title: ' Thing ', url: '  ' },
        { system: '', id: '', title: '' },
      ],
    });
    expect(request.threatIds).toEqual([
      { system: 'MITRE', id: 'T1', title: 'Thing', url: undefined },
    ]);
  });

  it('refuses an incomplete threat ID', () => {
    expect(() =>
      duplicateRiskTemplateRequest({
        ...template,
        threatIds: [{ system: 'MITRE', id: '', title: 'Thing' }],
      }),
    ).toThrow('system, an ID and a title');
  });

  it('refuses a template missing a required field', () => {
    expect(() =>
      duplicateRiskTemplateRequest({ ...template, statement: '  ' }),
    ).toThrow("can't be duplicated");
  });
});
