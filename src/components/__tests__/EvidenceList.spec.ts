import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import EvidenceList from '../EvidenceList.vue';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock('@/stores/config.ts', () => ({
  useConfigStore: () => ({
    showLabels: false,
    showHiddenLabels: false,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('EvidenceList', () => {
  beforeEach(() => {
    pushMock.mockClear();
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

  it('opens the evidence detail view when a row is clicked', async () => {
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
    });
  });
});
