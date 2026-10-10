import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import SystemExportOfferingsView from '../ExportOfferingsView.vue';
import SspEditorExportOfferingsView from '@/views/system-security-plans/SystemSecurityPlanExportOfferingsView.vue';

const systemStoreState = reactive({
  system: {
    securityPlan: { uuid: 'selected-ssp' } as { uuid: string } | null,
  },
});

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => systemStoreState,
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'route-ssp' } }),
}));

const stubs = {
  Message: { template: '<div><slot /></div>' },
  // Both hosts must render the SAME panel — the extraction exists so the System tab and the
  // SSP-editor route can't fork behaviour the way the two StatementByComponent copies did.
  ExportOfferingsPanel: {
    props: ['sspId'],
    template: '<div data-testid="panel" :data-ssp-id="sspId" />',
  },
};

describe('Export Offerings hosts', () => {
  beforeEach(() => {
    systemStoreState.system.securityPlan = { uuid: 'selected-ssp' };
  });

  it('renders the shared panel against the selected SSP on the System tab', () => {
    const wrapper = mount(SystemExportOfferingsView, { global: { stubs } });
    expect(
      wrapper.find('[data-testid="panel"]').attributes('data-ssp-id'),
    ).toBe('selected-ssp');
  });

  it('tells the user to select an SSP when none is selected', () => {
    systemStoreState.system.securityPlan = null;
    const wrapper = mount(SystemExportOfferingsView, { global: { stubs } });
    expect(wrapper.find('[data-testid="panel"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('System Security Plan not selected');
  });

  it('renders the same panel against the route SSP on the SSP-editor route', () => {
    const wrapper = mount(SspEditorExportOfferingsView, { global: { stubs } });
    expect(
      wrapper.find('[data-testid="panel"]').attributes('data-ssp-id'),
    ).toBe('route-ssp');
  });
});
