import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AssessmentResult } from '@/oscal';
import AssessmentResultsOverviewView from '../AssessmentResultsOverviewView.vue';
import AssessmentResultsImportApView from '../AssessmentResultsImportApView.vue';

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn((url?: string) => ({
    data: ref(url?.endsWith('/results') ? [{ uuid: 'r-1' }] : undefined),
    execute: vi.fn(),
    isLoading: ref(false),
  })),
  decamelizeKeys: (data: unknown) => data,
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/stores/config', () => ({ useConfigStore: () => ({}) }));
vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({ confirmDeleteDialog: vi.fn() }),
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

// As returned by GET /api/oscal/assessment-results/:id, camelCased: `import-ap`
// becomes `importAp`, and results are only served by /results.
const assessmentResults = {
  uuid: 'ar-1',
  metadata: { title: 'IFA GoodRead AR' },
  importAp: { href: './ap.oscal.xml', remarks: 'Imported plan' },
  results: [],
} as unknown as AssessmentResult;

const global = { directives: { tooltip: {} }, stubs: { RouterLink: true } };

describe('assessment results import-ap', () => {
  it('shows the stored import-ap href and the real result count', async () => {
    const wrapper = mount(AssessmentResultsOverviewView, {
      props: { assessmentResults },
      global,
    });
    await flushPromises();

    expect(wrapper.text()).toContain('./ap.oscal.xml');
    expect(wrapper.text()).toContain('Imported plan');
    expect(wrapper.text()).toMatch(/contains\s*1\s*result/);
  });

  it('prefills the import-ap form with the stored values', async () => {
    const wrapper = mount(AssessmentResultsImportApView, {
      props: { assessmentResults },
      global,
    });
    await flushPromises();

    const values = wrapper
      .findAll('input, textarea')
      .map((el) => (el.element as HTMLInputElement).value);
    expect(values).toContain('./ap.oscal.xml');
    expect(values).toContain('Imported plan');
  });
});
