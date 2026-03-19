import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import ProfileComplianceView from '../profile/ProfileComplianceView.vue';
import type {
  ProfileComplianceControl,
  ProfileComplianceGroup,
  ProfileComplianceSummary,
} from '@/types/compliance';

const route = reactive({ params: { id: 'profile-1' } });

const mockSummary = ref<ProfileComplianceSummary | undefined>();
const mockControls = ref<ProfileComplianceControl[]>([]);
const mockGroups = ref<ProfileComplianceGroup[]>([]);
const mockIsLoading = ref(false);
const mockError = ref(null);
const mockLoadCompliance = vi.fn();
const mockToastAdd = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => route,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

vi.mock('@/composables/useProfileCompliance', () => ({
  useProfileCompliance: () => ({
    summary: mockSummary,
    controls: mockControls,
    groups: mockGroups,
    isLoading: mockIsLoading,
    error: mockError,
    loadCompliance: mockLoadCompliance,
  }),
}));

function mountComponent() {
  return mount(ProfileComplianceView, {
    global: {
      stubs: {
        PageHeader: {
          template: '<div><slot /></div>',
        },
        ResultStatusBadge: {
          props: ['green', 'gray', 'red'],
          template:
            '<div class="status-badge">{{ green }} {{ gray }} {{ red }}</div>',
        },
      },
    },
  });
}

describe('ProfileComplianceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.params.id = 'profile-1';

    mockSummary.value = {
      totalControls: 3,
      satisfied: 1,
      notSatisfied: 1,
      unknown: 1,
      compliancePercent: 33,
      assessedPercent: 67,
    };

    mockControls.value = [
      {
        controlId: 'CTRL-SAT',
        catalogId: 'catalog-1',
        title: 'Satisfied Control',
        statusCounts: [{ status: 'satisfied', count: 2 }],
        computedStatus: 'satisfied',
      },
      {
        controlId: 'CTRL-NS',
        catalogId: 'catalog-1',
        title: 'Not Satisfied Control',
        statusCounts: [{ status: 'not-satisfied', count: 1 }],
        computedStatus: 'not-satisfied',
      },
      {
        controlId: 'CTRL-UNK',
        catalogId: 'catalog-1',
        title: 'Unknown Control',
        statusCounts: [],
        computedStatus: 'unknown',
      },
    ];

    mockGroups.value = [
      {
        id: 'CC',
        title: 'Common Criteria',
        totalControls: 3,
        satisfied: 1,
        notSatisfied: 1,
        unknown: 1,
        compliancePercent: 33,
      },
    ];

    mockIsLoading.value = false;
    mockError.value = null;
    mockLoadCompliance.mockResolvedValue(undefined);
  });

  it('loads and renders compliance summary details', async () => {
    const wrapper = mountComponent();
    await flushPromises();

    expect(mockLoadCompliance).toHaveBeenCalledWith({ includeControls: true });
    expect(wrapper.text()).toContain('Overall Profile Progress');
    expect(wrapper.text()).toContain('33% compliant');
    expect(wrapper.text()).toContain('CTRL-SAT');
    expect(wrapper.text()).toContain('CTRL-NS');
    expect(wrapper.text()).toContain('CTRL-UNK');
  });

  it('shows loading state', async () => {
    mockIsLoading.value = true;
    const wrapper = mountComponent();
    await flushPromises();

    expect(wrapper.text()).toContain('Loading compliance progress...');
  });
});
