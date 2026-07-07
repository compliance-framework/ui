import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Dashboard } from '@/stores/filters';
import type { Control, SystemComponent } from '@/oscal';
import { FilterParser } from '@/parsers/labelfilter';

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

vi.mock('@/composables/axios', () => ({
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
        MultiSelect: { props: ['modelValue'], template: '<div />' },
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

describe('FilterForm (edit prefill)', () => {
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
});
