import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import RiskRegisterPanel from '../RiskRegisterPanel.vue';
import type { Risk } from '@/oscal';
import type { SspOption } from '../RiskRegisterPanel.vue';

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: vi.fn(),
  }),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    execute: vi.fn(),
    data: { value: null },
    isLoading: { value: false },
    error: { value: null },
  }),
  decamelizeKeys: (data: unknown) => data,
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {},
    query: {},
  }),
  useRouter: () => ({
    replace: vi.fn(),
  }),
  RouterLink: {
    name: 'RouterLink',
    template: '<a><slot /></a>',
  },
}));

const globalStubs = {
  RouterLink: true,
  RouterLinkButton: true,
  Dialog: true,
  RiskCreateForm: true,
  RiskEditForm: true,
};

const createMockRisk = (overrides: Partial<Risk> = {}): Risk => ({
  uuid: 'risk-1',
  title: 'Test Risk',
  description: 'Test description',
  statement: 'Test statement',
  status: 'open',
  ...overrides,
});

describe('RiskRegisterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: true,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Loading risks');
  });

  it('renders error state', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
        error: 'Failed to load risks',
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Error loading risks');
    expect(wrapper.text()).toContain('Failed to load risks');
  });

  it('renders context missing state', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
        contextMissing: true,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('System Security Plan not selected');
  });

  it('renders risk summary stats', () => {
    const risks: Risk[] = [
      createMockRisk({ uuid: 'risk-1', status: 'open' }),
      createMockRisk({ uuid: 'risk-2', status: 'open' }),
      createMockRisk({ uuid: 'risk-3', status: 'risk-accepted' }),
      createMockRisk({ uuid: 'risk-4', status: 'closed' }),
    ];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Active Risks');
    expect(wrapper.text()).toContain('3'); // Excludes closed risk
    expect(wrapper.text()).toContain('Open Risks');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('Accepted Risks');
    expect(wrapper.text()).toContain('1');
  });

  it('renders risk list with risk details', () => {
    const risks: Risk[] = [
      createMockRisk({
        uuid: 'risk-1',
        title: 'Critical Security Risk',
        description: 'This is a critical security issue',
        status: 'open',
      }),
    ];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Critical Security Risk');
    expect(wrapper.text()).toContain('This is a critical security issue');
    expect(wrapper.text()).toContain('Open');
  });

  it('displays SSP column when sspMap is provided', () => {
    const risks: Risk[] = [createMockRisk({ uuid: 'risk-1' })];
    const sspMap = { 'ssp-1': 'Production SSP' };
    const riskSspIds = { 'risk-1': 'ssp-1' };

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
        sspMap,
        riskSspIds,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Production SSP');
  });

  it('shows SSP filter when availableSsps is provided', () => {
    const ssps: SspOption[] = [
      { uuid: 'ssp-1', title: 'SSP One' },
      { uuid: 'ssp-2', title: 'SSP Two' },
    ];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
        availableSsps: ssps,
        riskSspIds: { 'risk-1': 'ssp-1' },
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('All SSPs');
    expect(wrapper.text()).toContain('SSP One');
    expect(wrapper.text()).toContain('SSP Two');
  });

  it('shows bulk operations when enabled', () => {
    const risks: Risk[] = [createMockRisk({ uuid: 'risk-1' })];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
        enableBulkOps: true,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Select all visible');
  });

  it('hides bulk operations when disabled', () => {
    const risks: Risk[] = [createMockRisk({ uuid: 'risk-1' })];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
        enableBulkOps: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).not.toContain('Select all visible');
  });

  it('displays pagination when pageSize is set', () => {
    const risks: Risk[] = Array.from({ length: 30 }, (_, i) =>
      createMockRisk({ uuid: `risk-${i}`, title: `Risk ${i}` }),
    );

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
        pageSize: 10,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Page 1 of 3');
    expect(wrapper.text()).toContain('Previous');
    expect(wrapper.text()).toContain('Next');
  });

  it('shows no risks message when list is empty', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('No risks found');
  });

  it('displays threat count badge', () => {
    const risks: Risk[] = [
      createMockRisk({
        uuid: 'risk-1',
        threatIds: [
          { id: 'threat-1', system: 'oscal' },
          { id: 'threat-2', system: 'oscal' },
        ],
      }),
    ];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('2 Threats');
  });

  it('displays overdue review badge', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const risks: Risk[] = [
      createMockRisk({
        uuid: 'risk-1',
        deadline: pastDate,
      }),
    ];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Overdue Review');
  });

  it('emits risk-created event', async () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
        sspId: 'ssp-1',
      },
      global: { stubs: globalStubs },
    });

    const newRisk = createMockRisk({ uuid: 'new-risk' });
    await wrapper.vm.$emit('risk-created', newRisk);

    expect(wrapper.emitted('risk-created')).toBeTruthy();
    expect(wrapper.emitted('risk-created')?.[0]).toEqual([newRisk]);
  });

  it('emits risk-updated event', async () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
        sspId: 'ssp-1',
      },
      global: { stubs: globalStubs },
    });

    const updatedRisk = createMockRisk({ uuid: 'risk-1', title: 'Updated' });
    await wrapper.vm.$emit('risk-updated', updatedRisk);

    expect(wrapper.emitted('risk-updated')).toBeTruthy();
    expect(wrapper.emitted('risk-updated')?.[0]).toEqual([updatedRisk]);
  });

  it('emits risk-deleted event', async () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
        sspId: 'ssp-1',
      },
      global: { stubs: globalStubs },
    });

    await wrapper.vm.$emit('risk-deleted', 'risk-1', 'ssp-1');

    expect(wrapper.emitted('risk-deleted')).toBeTruthy();
    expect(wrapper.emitted('risk-deleted')?.[0]).toEqual(['risk-1', 'ssp-1']);
  });

  it('uses custom title when provided', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
        title: 'Custom Risk Title',
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Custom Risk Title');
  });

  it('shows Create Risk button', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Create Risk');
  });

  it('displays filter controls', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Search');
    expect(wrapper.text()).toContain('Status');
    expect(wrapper.text()).toContain('Likelihood');
    expect(wrapper.text()).toContain('Impact');
    expect(wrapper.text()).toContain('Owner');
    expect(wrapper.text()).toContain('Review Deadline');
    expect(wrapper.text()).toContain('Control ID');
    expect(wrapper.text()).toContain('Evidence ID');
    expect(wrapper.text()).toContain('Sort');
  });

  it('displays Reset Filters button', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('Reset Filters');
  });

  it('sanitizes CSV cells to prevent injection', () => {
    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks: [],
        loading: false,
      },
      global: { stubs: globalStubs },
    });

    // Access the sanitizeCsvCell function via component instance
    const component = wrapper.vm as unknown as {
      sanitizeCsvCell: (value: string) => string;
    };

    // Test formula-triggering characters
    expect(component.sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(component.sanitizeCsvCell('+1234')).toBe("'+1234");
    expect(component.sanitizeCsvCell('-1234')).toBe("'-1234");
    expect(component.sanitizeCsvCell('@username')).toBe("'@username");

    // Test with leading whitespace
    expect(component.sanitizeCsvCell('  =SUM(A1:A10)')).toBe("'  =SUM(A1:A10)");
    expect(component.sanitizeCsvCell('\t+1234')).toBe("'\t+1234");

    // Test safe values (should not be modified)
    expect(component.sanitizeCsvCell('Normal text')).toBe('Normal text');
    expect(component.sanitizeCsvCell('123')).toBe('123');
    expect(component.sanitizeCsvCell('')).toBe('');
  });

  it('exports CSV with selected risks', () => {
    const risks: Risk[] = [
      createMockRisk({
        uuid: 'risk-1',
        title: 'Test Risk 1',
        description: 'Description 1',
        status: 'open',
      }),
      createMockRisk({
        uuid: 'risk-2',
        title: '=MALICIOUS()',
        description: 'Description 2',
        status: 'closed',
      }),
    ];

    const wrapper = mount(RiskRegisterPanel, {
      props: {
        risks,
        loading: false,
        enableBulkOps: true,
      },
      global: { stubs: globalStubs },
    });

    const component = wrapper.vm as unknown as {
      selectedRiskIds: Set<string>;
      exportCsv: () => void;
    };

    // Select the first risk
    component.selectedRiskIds.add('risk-1');

    // Mock URL.createObjectURL and document methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => null as unknown as Node);
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => null as unknown as Node);

    // Call exportCsv
    component.exportCsv();

    // Verify CSV was created
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith('a');

    // Cleanup
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
