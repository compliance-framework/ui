import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import EvidenceList from '../EvidenceList.vue';

const { pushMock, routeMock, configStore } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  routeMock: {
    query: {
      filter: 'recent',
      page: '2',
      sortBy: 'name',
      sortDirection: 'asc',
    },
  },
  configStore: {
    showLabels: false,
    showHiddenLabels: false,
  },
}));

vi.mock('@/stores/config.ts', () => ({
  useConfigStore: () => configStore,
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('EvidenceList', () => {
  beforeEach(() => {
    pushMock.mockClear();
    routeMock.query = {
      filter: 'recent',
      page: '2',
      sortBy: 'name',
      sortDirection: 'asc',
    };
    configStore.showLabels = false;
    configStore.showHiddenLabels = false;
  });

  it('renders the Last Seen At column from evidence end', () => {
    const wrapper = mount(EvidenceList, {
      props: {
        evidence: [
          {
            id: 'evidence-1',
            uuid: 'stream-1',
            title: 'Evidence Raw Timestamp',
            start: '2026-04-15T00:00:00Z',
            end: 'not-a-real-date',
            status: {
              reason: 'test',
              state: 'satisfied',
            },
            labels: [],
            activities: [],
          },
        ],
      },
      global: {
        directives: {
          tooltip: {
            mounted() {
              return;
            },
          },
        },
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
          ResultStatusRing: {
            template: '<span />',
          },
          LabelList: {
            template: '<span />',
          },
          Popover: {
            template: '<div><slot /></div>',
          },
          Chip: {
            template: '<span />',
          },
          BIconEye: {
            template: '<span />',
          },
        },
      },
    });

    expect(wrapper.text()).toContain('Last Seen At');
    expect(wrapper.text()).toContain('not-a-real-date');
    expect(wrapper.text()).not.toContain('Actions');
    expect(wrapper.text()).not.toContain('History');
    expect(wrapper.text()).not.toContain('View');
  });

  it('emits sort events from sortable column headers', async () => {
    const wrapper = mount(EvidenceList, {
      props: {
        evidence: [],
        sortBy: 'lastSeenAt',
        sortDirection: 'desc',
      },
      global: {
        directives: {
          tooltip: {
            mounted() {
              return;
            },
          },
        },
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
          ResultStatusRing: {
            template: '<span />',
          },
          LabelList: {
            template: '<span />',
          },
          Popover: {
            template: '<div><slot /></div>',
          },
          Chip: {
            template: '<span />',
          },
          BIconEye: {
            template: '<span />',
          },
        },
      },
    });

    expect(wrapper.find('th[aria-sort="descending"]').text()).toContain(
      'Last Seen At',
    );

    await wrapper.find('[data-testid="sort-status"]').trigger('click');
    await wrapper.find('[data-testid="sort-evidence-name"]').trigger('click');
    await wrapper.find('[data-testid="sort-last-seen-at"]').trigger('click');

    expect(wrapper.emitted('sort')).toEqual([
      ['status'],
      ['name'],
      ['lastSeenAt'],
    ]);
  });

  it('opens the evidence detail view when a row is clicked and exposes a detail link', async () => {
    const wrapper = mount(EvidenceList, {
      props: {
        evidence: [
          {
            id: 'evidence-1',
            uuid: 'stream-1',
            title: 'Clickable Evidence',
            start: '2026-04-15T00:00:00Z',
            end: '2026-04-15T12:00:00Z',
            status: {
              reason: 'test',
              state: 'satisfied',
            },
            labels: [],
            activities: [],
          },
        ],
      },
      global: {
        directives: {
          tooltip: {
            mounted() {
              return;
            },
          },
        },
        stubs: {
          RouterLink: {
            props: ['to'],
            template:
              '<a :data-to="JSON.stringify(to)" :aria-label="$attrs[\'aria-label\']"><slot /></a>',
          },
          ResultStatusRing: {
            template: '<span />',
          },
          LabelList: {
            template: '<span />',
          },
          Popover: {
            template: '<div><slot /></div>',
          },
          Chip: {
            template: '<span />',
          },
          BIconEye: {
            template: '<span />',
          },
        },
      },
    });

    await wrapper.find('tbody tr').trigger('click');

    expect(pushMock).toHaveBeenCalledWith({
      name: 'evidence:view',
      params: { id: 'evidence-1' },
      query: {
        filter: 'recent',
        page: '2',
        sortBy: 'name',
        sortDirection: 'asc',
      },
    });
    const evidenceLink = wrapper.find('[data-to*="evidence-1"]');
    expect(evidenceLink.exists()).toBe(true);
    expect(evidenceLink.element.tagName).toBe('A');
    expect(evidenceLink.text()).toBe('Clickable Evidence');
    expect(evidenceLink.attributes('aria-label')).toBe(
      'Open evidence Clickable Evidence',
    );
    expect(evidenceLink.attributes('data-to')).toContain('"filter":"recent"');
    expect(evidenceLink.attributes('data-to')).toContain('"page":"2"');
  });

  it('shows the first five labels and a compact remaining-label hint', async () => {
    configStore.showLabels = true;
    const longLabelValue =
      'arn:aws:iam::448923944987:role/aws-service-role/resource-explorer-2.amazonaws.com/AWSServiceRoleForResourceExplorer';

    const wrapper = mount(EvidenceList, {
      props: {
        evidence: [
          {
            id: 'evidence-1',
            uuid: 'stream-1',
            title: 'Evidence With Long Label',
            start: '2026-04-15T00:00:00Z',
            end: '2026-04-15T12:00:00Z',
            status: {
              reason: 'test',
              state: 'satisfied',
            },
            labels: [
              {
                name: 'resource_id',
                value: longLabelValue,
              },
              { name: 'account_id', value: '448923944987' },
              { name: 'region', value: 'us-east-1' },
              { name: 'service', value: 'iam' },
              { name: 'type', value: 'role' },
              { name: 'environment', value: 'production' },
              { name: 'owner', value: 'security' },
            ],
            activities: [],
          },
        ],
      },
      global: {
        directives: {
          tooltip: {
            mounted() {
              return;
            },
          },
        },
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
          ResultStatusRing: {
            template: '<span />',
          },
          Popover: {
            template: '<div><slot /></div>',
            methods: {
              toggle() {
                return;
              },
            },
          },
          Chip: {
            template: '<span>{{ label }}</span>',
            props: ['label'],
          },
          BIconEye: {
            template: '<span />',
          },
        },
      },
    });

    const preview = wrapper.find('[data-testid="label-preview"]');
    const previewLabels = preview.findAll('span[title]');
    const moreLabels = preview.findAll('button').find((button) => {
      return button.text().includes('+2 more labels');
    });

    expect(wrapper.find('table').classes()).toContain('table-fixed');
    expect(preview.text()).toContain(`resource_id=${longLabelValue}`);
    expect(preview.text()).toContain('account_id=448923944987');
    expect(preview.text()).toContain('region=us-east-1');
    expect(preview.text()).toContain('service=iam');
    expect(preview.text()).toContain('type=role');
    expect(preview.text()).toContain('+2 more labels');
    expect(preview.text()).not.toContain('environment=production');
    expect(preview.text()).not.toContain('owner=security');
    expect(moreLabels?.attributes('title')).toBeUndefined();
    expect(moreLabels?.attributes('aria-label')).toBe(
      'View all labels. +2 more labels: environment=production; owner=security',
    );
    await moreLabels?.trigger('click');
    expect(wrapper.text()).toContain('environment=production');
    expect(wrapper.text()).toContain('owner=security');
    expect(previewLabels[0].classes()).toEqual(
      expect.arrayContaining([
        'max-w-full',
        'whitespace-normal',
        'break-words',
        '[overflow-wrap:anywhere]',
      ]),
    );
  });

  it('hides underscore-prefixed labels until hidden labels are enabled but always shows all labels in the popover', async () => {
    configStore.showLabels = true;

    const mountWithHiddenLabels = () =>
      mount(EvidenceList, {
        props: {
          evidence: [
            {
              id: 'evidence-1',
              uuid: 'stream-1',
              title: 'Evidence With Hidden Labels',
              start: '2026-04-15T00:00:00Z',
              end: '2026-04-15T12:00:00Z',
              status: {
                reason: 'test',
                state: 'satisfied',
              },
              labels: [
                { name: '_internal', value: 'secret' },
                { name: 'resource_id', value: 'visible-resource' },
              ],
              activities: [],
            },
          ],
        },
        global: {
          directives: {
            tooltip: {
              mounted() {
                return;
              },
            },
          },
          stubs: {
            RouterLink: {
              props: ['to'],
              template: '<a><slot /></a>',
            },
            ResultStatusRing: {
              template: '<span />',
            },
            Popover: {
              template: '<div><slot /></div>',
              methods: {
                toggle() {
                  return;
                },
              },
            },
            Chip: {
              template: '<span>{{ label }}</span>',
              props: ['label'],
            },
            BIconEye: {
              template: '<span data-testid="eye-icon" />',
            },
          },
        },
      });

    const wrapper = mountWithHiddenLabels();
    const preview = wrapper.find('[data-testid="label-preview"]');

    expect(preview.text()).toContain('resource_id=visible-resource');
    expect(preview.text()).not.toContain('_internal=secret');
    expect(wrapper.find('button[aria-label="View All Labels"]').exists()).toBe(
      true,
    );

    await wrapper.find('button[aria-label="View All Labels"]').trigger('click');

    expect(wrapper.text()).toContain('_internal=secret');
    expect(wrapper.text()).toContain('resource_id=visible-resource');

    configStore.showHiddenLabels = true;
    const showHiddenWrapper = mountWithHiddenLabels();
    const showHiddenPreview = showHiddenWrapper.find(
      '[data-testid="label-preview"]',
    );

    expect(showHiddenPreview.text()).toContain('_internal=secret');
    expect(showHiddenPreview.text()).toContain('resource_id=visible-resource');
  });
});
