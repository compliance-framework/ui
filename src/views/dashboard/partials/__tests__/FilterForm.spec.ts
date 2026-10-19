import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Dashboard } from '@/stores/filters';
import type { Control, SystemComponent } from '@/oscal';
import { FilterParser } from '@/parsers/labelfilter';

const configState = vi.hoisted(() => ({
  filterComponentLinkingEnabled: true,
}));

vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    get filterComponentLinkingEnabled() {
      return configState.filterComponentLinkingEnabled;
    },
    getConfig: async () => ({}),
  }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

const scopeGet = vi.hoisted(() => vi.fn());

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: scopeGet }),
  useDataApi: (url?: string | null) => {
    if (
      url === '/api/oscal/catalogs' ||
      url === '/api/oscal/system-security-plans'
    ) {
      return { data: ref([]) };
    }
    return { execute: vi.fn() };
  },
  decamelizeKeys: (v: unknown) => v,
}));

import FilterForm from '../FilterForm.vue';

function makeDashboard(): Dashboard {
  return {
    id: 'd1',
    uuid: 'd1',
    name: 'Payments findings',
    sspId: 'ssp-1',
    filter: new FilterParser('team=payments AND env!=dev').parse(),
    controls: [{ id: 'ac-1', title: 'Access Control' } as Control],
    components: [{ uuid: 'comp-1', title: 'API Gateway' } as SystemComponent],
  };
}

function mountForm(dashboard: Dashboard) {
  return mount(FilterForm, {
    props: { dashboard, submitLabel: 'Save', showCancel: true },
    global: {
      directives: { tooltip: { mounted: () => undefined } },
      stubs: {
        FormInput: {
          props: ['modelValue'],
          template: '<input :value="modelValue" />',
        },
        Select: { props: ['modelValue'], template: '<div />' },
        MultiSelect: {
          props: ['modelValue', 'placeholder'],
          template: '<div class="multiselect">{{ placeholder }}</div>',
        },
        PrimaryButton: {
          template: '<button type="submit"><slot /></button>',
        },
        SecondaryButton: {
          template: '<button type="button"><slot /></button>',
        },
      },
    },
  });
}

function scopeWith(entries: unknown[]) {
  return { data: { data: { autoFilters: false, entries, exceptions: [] } } };
}

describe('FilterForm (edit prefill)', () => {
  beforeEach(() => {
    configState.filterComponentLinkingEnabled = true;
    scopeGet.mockReset();
    scopeGet.mockResolvedValue(scopeWith([]));
  });

  it('prefills name and the serialized filter string', () => {
    const wrapper = mountForm(makeDashboard());
    const inputs = wrapper.findAll('input');
    expect((inputs[0].element as HTMLInputElement).value).toBe(
      'Payments findings',
    );
    expect((inputs[1].element as HTMLInputElement).value).toBe(
      'team=payments AND env!=dev',
    );
  });

  it('emits a submit payload with parsed filter and control/component ids', async () => {
    const wrapper = mountForm(makeDashboard());
    await flushPromises();
    await wrapper.find('form').trigger('submit');

    const payload = wrapper.emitted('submit')?.[0]?.[0] as {
      name: string;
      sspId: string | null;
      controls: string[];
      components: string[];
      filter: unknown;
    };
    expect(payload.name).toBe('Payments findings');
    expect(payload.sspId).toBe('ssp-1');
    expect(payload.controls).toEqual(['ac-1']);
    expect(payload.components).toEqual(['comp-1']);
    expect(payload.filter).toEqual(
      new FilterParser('team=payments AND env!=dev').parse(),
    );
  });

  it('shows the Components selector when filter component linking is enabled', () => {
    const wrapper = mountForm(makeDashboard());
    expect(wrapper.text()).toContain('Select Components');
  });

  it('hides the Components selector but keeps existing links when the flag is disabled', async () => {
    configState.filterComponentLinkingEnabled = false;
    const wrapper = mountForm(makeDashboard());
    expect(wrapper.text()).not.toContain('Select Components');
    expect(wrapper.text()).toContain('Select Controls');

    await flushPromises();
    await wrapper.find('form').trigger('submit');
    const payload = wrapper.emitted('submit')?.[0]?.[0] as {
      components: string[];
    };
    expect(payload.components).toEqual(['comp-1']);
  });

  it('pre-selects the SSP given on create', async () => {
    const wrapper = mountCreate('ssp-9');

    await flushPromises();
    await wrapper.find('form').trigger('submit');
    const payload = wrapper.emitted('submit')?.[0]?.[0] as {
      sspId: string | null;
    };
    expect(payload.sspId).toBe('ssp-9');
  });

  it('offers to follow the scope of an SSP that has one, on by default for new filters', async () => {
    scopeGet.mockResolvedValue(scopeWith([{ id: 'e-1' }]));
    const wrapper = mountCreate('ssp-9');
    await flushPromises();

    const follow = wrapper.find('[data-testid="follow-ssp-scope"]');
    expect(scopeGet).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-9/scope',
    );
    expect((follow.element as HTMLInputElement).checked).toBe(true);

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      sspId: 'ssp-9',
      followSspScope: true,
    });
  });

  it('shows a failed scope read and refuses to save until it is retried', async () => {
    scopeGet.mockRejectedValueOnce({ response: { status: 500 } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const wrapper = mountCreate('ssp-9');
    await flushPromises();

    expect(wrapper.find('[data-testid="scope-error"]').exists()).toBe(true);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();

    scopeGet.mockResolvedValue(scopeWith([{ id: 'e-1' }]));
    await wrapper.find('[data-testid="scope-error"] button').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="scope-error"]').exists()).toBe(false);
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      followSspScope: true,
    });
  });

  it('does not offer to follow an SSP without scope entries', async () => {
    const wrapper = mountCreate('ssp-9');
    await flushPromises();

    expect(wrapper.find('[data-testid="follow-ssp-scope"]').exists()).toBe(
      false,
    );
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).not.toHaveProperty(
      'followSspScope',
    );
  });

  it('edits a following filter through its own expression, showing the effective one', async () => {
    const dashboard = {
      ...makeDashboard(),
      filter: new FilterParser('team=payments AND repo=a').parse(),
      scopeBase: new FilterParser('team=payments').parse(),
    };
    const wrapper = mountForm(dashboard);
    await flushPromises();

    const input = () => wrapper.findAll('input')[1].element as HTMLInputElement;
    expect(input().value).toBe('team=payments');
    expect(wrapper.find('[data-testid="effective-filter"]').text()).toContain(
      'team=payments AND repo=a',
    );

    // Under another SSP's scope, this effective filter no longer applies.
    scopeGet.mockResolvedValue(scopeWith([{ id: 'e-2' }]));
    (wrapper.vm as unknown as { selectedSspId: string }).selectedSspId =
      'ssp-2';
    await flushPromises();
    expect(wrapper.find('[data-testid="follow-ssp-scope"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="effective-filter"]').exists()).toBe(
      false,
    );
    (wrapper.vm as unknown as { selectedSspId: string }).selectedSspId =
      'ssp-1';
    await flushPromises();

    // Unticking keeps the effective filter, as the API does.
    await wrapper.find('[data-testid="follow-ssp-scope"]').setValue(false);
    expect(input().value).toBe('team=payments AND repo=a');

    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      followSspScope: false,
    });
  });
});

function mountCreate(initialSspId: string) {
  return mount(FilterForm, {
    props: { initialFilter: 'team=payments', initialSspId },
    global: {
      directives: { tooltip: { mounted: () => undefined } },
      stubs: {
        FormInput: {
          props: ['modelValue'],
          template: '<input :value="modelValue" />',
        },
        Select: { props: ['modelValue'], template: '<div />' },
        MultiSelect: { props: ['modelValue'], template: '<div />' },
        PrimaryButton: { template: '<button type="submit"><slot /></button>' },
      },
    },
  });
}
