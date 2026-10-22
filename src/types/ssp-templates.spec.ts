import camelcaseKeys from 'camelcase-keys';
import { describe, expect, it } from 'vitest';
import {
  buildUpsertSspTemplatePayload,
  createEmptySspTemplateForm,
  createSspTemplateFormFromTemplate,
  formatSspTemplateDate,
  formatKeyValues,
  formatLabels,
  parseSspTemplateFilter,
  SSP_TEMPLATE_INSTANCES_STOP_PATHS,
  SSP_TEMPLATE_PREVIEW_STOP_PATHS,
  toSspTemplateRequest,
  type SspTemplateFormData,
} from './ssp-templates';

function validForm(
  overrides: Partial<SspTemplateFormData> = {},
): SspTemplateFormData {
  return {
    ...createEmptySspTemplateForm(),
    name: ' Applications by _app ',
    keys: ['_app'],
    titleTemplate: 'SSP for Application {{ ._app }}',
    ...overrides,
  };
}

describe('ssp-templates types', () => {
  it('starts an empty form enabled with one minimum stream', () => {
    expect(createEmptySspTemplateForm()).toMatchObject({
      enabled: true,
      minStreams: 1,
      keys: [],
      scopeLabels: [],
    });
  });

  it('builds a trimmed payload and drops empty rows', () => {
    const payload = buildUpsertSspTemplatePayload(
      validForm({
        keys: [' _app ', '_app', ''],
        scopeLabels: [['repo'], [], [' aws_account ', 'region', 'region']],
        minStreams: '2',
        descriptionTemplate: '  ',
        props: [
          { name: ' application ', value: '{{ ._app }}' },
          { name: '', value: '' },
        ],
        profileIds: ['p-1', 'p-1', 'p-2'],
      }),
    );

    expect(payload).toEqual({
      name: 'Applications by _app',
      enabled: true,
      keys: ['_app'],
      filter: null,
      scopeLabels: [['repo'], ['aws_account', 'region']],
      minStreams: 2,
      titleTemplate: 'SSP for Application {{ ._app }}',
      descriptionTemplate: undefined,
      props: [{ name: 'application', value: '{{ ._app }}' }],
      profileIds: ['p-1', 'p-2'],
    });
  });

  it('parses the filter text into a label filter', () => {
    expect(
      buildUpsertSspTemplatePayload(
        validForm({ filter: 'auto_create_ssp=true' }),
      ).filter,
    ).toEqual({
      scope: {
        condition: { label: 'auto_create_ssp', operator: '=', value: 'true' },
      },
    });
    expect(parseSspTemplateFilter('  ')).toBeNull();
    expect(() => parseSspTemplateFilter('a=b AND c=d OR e=f')).toThrow(
      /Filter is invalid/,
    );
  });

  it.each([
    [{ name: ' ' }, /name is required/],
    [{ keys: [] }, /At least one key/],
    [{ keys: ['a', 'b', 'c', 'd', 'e', 'f'] }, /At most 5 key/],
    [{ titleTemplate: '' }, /Title template is required/],
    [{ minStreams: 0 }, /at least 1/],
    [{ minStreams: '1.5' }, /whole number/],
    [{ minStreams: '' }, /whole number/],
    [{ scopeLabels: Array.from({ length: 11 }, () => ['a']) }, /At most 10/],
    [{ scopeLabels: [['a', 'b', 'c', 'd', 'e', 'f']] }, /group #1/],
    [{ props: [{ name: 'x', value: '' }] }, /Property row #1/],
  ] as Array<[Partial<SspTemplateFormData>, RegExp]>)(
    'rejects an invalid form (%o)',
    (overrides, message) => {
      expect(() => buildUpsertSspTemplatePayload(validForm(overrides))).toThrow(
        message,
      );
    },
  );

  it('round-trips a saved template into the form', () => {
    const form = createSspTemplateFormFromTemplate({
      id: 't-1',
      name: 'Apps',
      enabled: false,
      keys: ['_app'],
      filter: {
        scope: {
          query: {
            operator: 'and',
            scopes: [
              { condition: { label: 'a', operator: '=', value: '1' } },
              { condition: { label: 'b', operator: '!=', value: '2' } },
            ],
          },
        },
      },
      scopeLabels: [['repo']],
      minStreams: 3,
      titleTemplate: 'T',
      descriptionTemplate: null,
      props: null,
      profileIds: ['p-1'],
      createdAt: '2026-10-19T10:00:00Z',
      updatedAt: '2026-10-19T10:00:00Z',
    });

    expect(form).toEqual({
      name: 'Apps',
      enabled: false,
      keys: ['_app'],
      filter: 'a=1 AND b!=2',
      scopeLabels: [['repo']],
      minStreams: 3,
      titleTemplate: 'T',
      descriptionTemplate: '',
      props: [],
      profileIds: ['p-1'],
    });
  });

  it('formats missing or invalid dates as a dash', () => {
    expect(formatSspTemplateDate(undefined)).toBe('-');
    expect(formatSspTemplateDate('nope')).toBe('-');
    expect(formatSspTemplateDate('2026-10-19T10:00:00Z')).not.toBe('-');
  });
});

describe('ssp-templates preview and instances helpers', () => {
  it('turns a saved template into a request without server-owned fields', () => {
    expect(
      toSspTemplateRequest({
        id: 't-1',
        name: 'Apps',
        enabled: true,
        keys: ['_app'],
        filter: undefined,
        scopeLabels: null,
        minStreams: 1,
        titleTemplate: 'T',
        descriptionTemplate: null,
        props: null,
        profileIds: null,
        createdAt: '2026-10-19T10:00:00Z',
        updatedAt: '2026-10-19T10:00:00Z',
        sspCount: 3,
      }),
    ).toEqual({
      name: 'Apps',
      enabled: true,
      keys: ['_app'],
      filter: null,
      scopeLabels: [],
      minStreams: 1,
      titleTemplate: 'T',
      descriptionTemplate: undefined,
      props: [],
      profileIds: [],
    });
  });

  it('formats key values and learned label sets', () => {
    expect(formatKeyValues({ _app: 'payments', aws_account: '1' })).toBe(
      '_app=payments, aws_account=1',
    );
    expect(
      formatLabels([
        { key: 'aws_account', value: '1' },
        { key: 'region', value: 'eu' },
      ]),
    ).toBe('aws_account=1 AND region=eu');
  });

  it('keeps label keys verbatim through the response camelCasing', () => {
    const preview = camelcaseKeys(
      {
        data: {
          ssps: [{ 'key-values': { _app: 'a', aws_account: '1' } }],
          'below-threshold': [{ 'key-values': { _app: 'b' } }],
          invalid: [{ 'key-values': { aws_account: 'x' } }],
          'missing-keys': 1,
        },
      },
      { deep: true, stopPaths: [...SSP_TEMPLATE_PREVIEW_STOP_PATHS] },
    );
    expect(preview).toEqual({
      data: {
        ssps: [{ keyValues: { _app: 'a', aws_account: '1' } }],
        belowThreshold: [{ keyValues: { _app: 'b' } }],
        invalid: [{ keyValues: { aws_account: 'x' } }],
        missingKeys: 1,
      },
    });

    const instances = camelcaseKeys(
      { data: [{ 'key-values': { aws_account: '1' }, 'ssp-id': null }] },
      { deep: true, stopPaths: [...SSP_TEMPLATE_INSTANCES_STOP_PATHS] },
    );
    expect(instances).toEqual({
      data: [{ keyValues: { aws_account: '1' }, sspId: null }],
    });
  });
});
