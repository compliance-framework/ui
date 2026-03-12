import { describe, expect, it } from 'vitest';
import {
  buildUpsertSubjectTemplatePayload,
  createEmptySubjectTemplateForm,
  generateUniqueSubjectTemplateCopyName,
  renderTemplateString,
} from './subject-templates';

describe('subject-templates helpers', () => {
  it('builds a normalized payload for create and edit submissions', () => {
    const form = createEmptySubjectTemplateForm();
    form.name = '  GitHub Repo Subject  ';
    form.type = 'component';
    form.sourceMode = 'automatic';
    form.titleTemplate = '  {{repository}}  ';
    form.descriptionTemplate = '  Repo {{repository}} in {{organization}}  ';
    form.purposeTemplate = '  Track repository risk  ';
    form.remarksTemplate = '  optional remark  ';
    form.labelSchema = [
      { key: ' repository ', description: ' Repo name ' },
      { key: ' organization ', description: '' },
      { key: '   ', description: '   ' },
    ];
    form.selectorLabels = [
      { key: ' plugin ', value: ' github ' },
      { key: ' ', value: ' ' },
    ];
    form.identityLabelKeys = [' repository ', 'organization', 'repository'];
    form.props = [
      {
        uuid: '',
        name: ' lifecycle ',
        value: ' production ',
        class: ' custom ',
        ns: ' ccf ',
        remarks: ' tracked ',
      },
      {
        uuid: '',
        name: ' ',
        value: ' ',
        class: '',
        ns: '',
        remarks: '',
      },
    ];
    form.links = [
      {
        href: ' https://github.com/example/repo ',
        rel: ' source ',
        text: ' repo ',
      },
      {
        href: ' ',
        rel: ' ',
        text: ' ',
      },
    ];

    const payload = buildUpsertSubjectTemplatePayload(form);

    expect(payload).toEqual({
      name: 'GitHub Repo Subject',
      type: 'component',
      sourceMode: 'automatic',
      titleTemplate: '{{repository}}',
      descriptionTemplate: 'Repo {{repository}} in {{organization}}',
      purposeTemplate: 'Track repository risk',
      remarksTemplate: 'optional remark',
      identityLabelKeys: ['repository', 'organization'],
      selectorLabels: [{ key: 'plugin', value: 'github' }],
      labelSchema: [
        { key: 'repository', description: 'Repo name' },
        { key: 'organization', description: undefined },
      ],
      props: [
        {
          uuid: undefined,
          name: 'lifecycle',
          value: 'production',
          class: 'custom',
          ns: 'ccf',
          remarks: 'tracked',
        },
      ],
      links: [
        {
          href: 'https://github.com/example/repo',
          rel: 'source',
          text: 'repo',
        },
      ],
    });
  });

  it('rejects identity keys that are missing from label schema', () => {
    const form = createEmptySubjectTemplateForm();
    form.name = 'Template';
    form.type = 'component';
    form.sourceMode = 'manual';
    form.labelSchema = [{ key: 'repository', description: '' }];
    form.selectorLabels = [{ key: 'plugin', value: 'github' }];
    form.identityLabelKeys = ['missing-key'];

    expect(() => buildUpsertSubjectTemplatePayload(form)).toThrow(
      'Identity label key "missing-key" must exist in label schema.',
    );
  });

  it('creates unique duplicate names with Copy suffixes', () => {
    expect(
      generateUniqueSubjectTemplateCopyName('Template', [
        'Template',
        'Template (Copy)',
      ]),
    ).toBe('Template (Copy 2)');

    expect(
      generateUniqueSubjectTemplateCopyName('Template', [
        'template (copy)',
        'Template (Copy 2)',
      ]),
    ).toBe('Template (Copy 3)');
  });

  it('renders template placeholders and reports unresolved keys', () => {
    const result = renderTemplateString(
      'Repo {{repository}} on {{branch}} by {{owner}}',
      {
        repository: 'ccf-ui',
        branch: 'main',
      },
    );

    expect(result.rendered).toBe('Repo ccf-ui on main by {{owner}}');
    expect(result.unresolvedKeys).toEqual(['owner']);
  });
});
