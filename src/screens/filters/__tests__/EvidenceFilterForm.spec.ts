import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
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
  usePermissions: () => ({ can: () => true }),
}));

const catalogState = vi.hoisted(() => ({
  catalogs: [] as unknown[],
  full: undefined as unknown,
}));
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
  put: vi.fn<(url: string, body: unknown) => Promise<unknown>>(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  useDataApi: (url?: string | null) => {
    if (url === '/api/oscal/system-security-plans') {
      return {
        data: ref(
          ['ssp-1', 'ssp-2', 'ssp-9'].map((uuid) => ({
            uuid,
            metadata: { title: uuid },
          })),
        ),
      };
    }
    if (url === '/api/oscal/catalogs') {
      // Arrives after mount, as a real request does.
      const data = ref<unknown[]>();
      queueMicrotask(() => (data.value = catalogState.catalogs));
      return { data };
    }
    return {
      execute: vi.fn(async (next: string) =>
        next?.endsWith('/full')
          ? { data: { value: { data: catalogState.full } } }
          : undefined,
      ),
    };
  },
}));

import EvidenceFilterForm from '../EvidenceFilterForm.vue';

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

function mountForm(props: Record<string, unknown>) {
  const saved: unknown[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(EvidenceFilterForm, {
            ...props,
            onSaved: (p: unknown) => saved.push(p),
          }),
        ),
    }),
  );
  return { wrapper, saved };
}
const mountEdit = (dashboard: Dashboard) => mountForm({ dashboard });
const mountCreate = (initialSspId: string) =>
  mountForm({ initialFilter: 'team=payments', initialSspId });

function scopeWith(entries: unknown[]) {
  return { data: { data: { autoFilters: false, entries, exceptions: [] } } };
}
const lastBody = () =>
  (api.post.mock.calls.at(-1) ?? api.put.mock.calls.at(-1))?.[1];
const submit = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.find('form').trigger('submit');
  await flushPromises();
};

describe('EvidenceFilterForm', () => {
  beforeEach(() => {
    configState.filterComponentLinkingEnabled = true;
    catalogState.catalogs = [];
    catalogState.full = undefined;
    api.get.mockReset().mockResolvedValue(scopeWith([]));
    api.post.mockReset().mockResolvedValue({});
    api.put.mockReset().mockResolvedValue({});
  });

  it('prefills name and the serialized filter string', () => {
    const { wrapper } = mountEdit(makeDashboard());
    const inputs = wrapper.findAll('input');
    expect(inputs[0]!.element.value).toBe('Payments findings');
    expect(inputs[1]!.element.value).toBe('team=payments AND env!=dev');
    expect(wrapper.text()).toContain('ac-1 Access Control');
    expect(wrapper.text()).toContain('API Gateway');
  });

  it('saves an edit with PUT: parsed filter and control and component ids', async () => {
    const { wrapper, saved } = mountEdit(makeDashboard());
    await flushPromises();
    await submit(wrapper);
    expect(api.put.mock.calls[0]![0]).toBe('/api/filters/d1');
    expect(lastBody()).toMatchObject({
      name: 'Payments findings',
      sspId: 'ssp-1',
      controls: ['ac-1'],
      components: ['comp-1'],
      filter: new FilterParser('team=payments AND env!=dev').parse(),
    });
    expect(saved).toHaveLength(1);
  });

  it('explains an invalid filter instead of doing nothing', async () => {
    const { wrapper } = mountEdit(makeDashboard());
    await flushPromises();
    await wrapper.findAll('input')[1]!.setValue('team');
    await submit(wrapper);
    expect(api.put).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Invalid condition format');
  });

  it('links controls or components, not both', () => {
    const { wrapper } = mountEdit(makeDashboard());
    expect(wrapper.text()).toContain(
      'This filter links to components. Remove them to link controls.',
    );
  });

  it('hides the components but keeps existing links when component linking is off', async () => {
    configState.filterComponentLinkingEnabled = false;
    const { wrapper } = mountEdit(makeDashboard());
    expect(wrapper.text()).not.toContain('API Gateway');
    await flushPromises();
    await submit(wrapper);
    expect(lastBody()).toMatchObject({ components: ['comp-1'] });
  });

  it('creates with POST, with the system given on create', async () => {
    const { wrapper } = mountCreate('ssp-9');
    await flushPromises();
    await wrapper.findAll('input')[0]!.setValue('New one');
    await submit(wrapper);
    expect(api.post.mock.calls[0]![0]).toBe('/api/filters');
    expect(lastBody()).toMatchObject({ name: 'New one', sspId: 'ssp-9' });
  });

  it('asks for a name', async () => {
    const { wrapper } = mountCreate('ssp-9');
    await flushPromises();
    await submit(wrapper);
    expect(wrapper.text()).toContain('Enter a name.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('offers to follow the scope of a system that has one, on by default for new filters', async () => {
    api.get.mockResolvedValue(scopeWith([{ id: 'e-1' }]));
    const { wrapper } = mountCreate('ssp-9');
    await flushPromises();
    expect(api.get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-9/scope',
    );
    expect(
      wrapper.find<HTMLInputElement>('[data-testid="follow-ssp-scope"] input')
        .element.checked,
    ).toBe(true);
    await wrapper.findAll('input')[0]!.setValue('Follower');
    await submit(wrapper);
    expect(lastBody()).toMatchObject({ sspId: 'ssp-9', followSspScope: true });
  });

  it('shows a failed scope read and refuses to save until it is retried', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { wrapper } = mountCreate('ssp-9');
    await flushPromises();
    await wrapper.findAll('input')[0]!.setValue('Follower');

    expect(wrapper.find('[data-testid="scope-error"]').exists()).toBe(true);
    await submit(wrapper);
    expect(api.post).not.toHaveBeenCalled();

    api.get.mockResolvedValue(scopeWith([{ id: 'e-1' }]));
    await wrapper.find('[data-testid="scope-error"] button').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="scope-error"]').exists()).toBe(false);
    await submit(wrapper);
    expect(lastBody()).toMatchObject({ followSspScope: true });
  });

  it('does not offer to follow a system without scope entries', async () => {
    const { wrapper } = mountCreate('ssp-9');
    await flushPromises();
    expect(wrapper.find('[data-testid="follow-ssp-scope"]').exists()).toBe(
      false,
    );
    await wrapper.findAll('input')[0]!.setValue('Plain');
    await submit(wrapper);
    expect(lastBody()).not.toHaveProperty('followSspScope');
  });

  it('edits a following filter through its own expression, showing the effective one', async () => {
    const dashboard = {
      ...makeDashboard(),
      filter: new FilterParser('team=payments AND repo=a').parse(),
      scopeBase: new FilterParser('team=payments').parse(),
    };
    api.get.mockResolvedValue(scopeWith([{ id: 'e-1' }]));
    const { wrapper } = mountEdit(dashboard);
    await flushPromises();

    const input = () => wrapper.findAll('input')[1]!.element;
    expect(input().value).toBe('team=payments');
    expect(wrapper.find('[data-testid="effective-filter"]').text()).toContain(
      'team=payments AND repo=a',
    );

    // Under another system's scope, this effective filter no longer applies.
    const system = wrapper
      .findAll('select')
      .find((s) => s.element.value === 'ssp-1')!;
    await system.setValue('ssp-2');
    await flushPromises();
    expect(wrapper.find('[data-testid="follow-ssp-scope"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="effective-filter"]').exists()).toBe(
      false,
    );
    await system.setValue('ssp-1');
    await flushPromises();

    // Unticking keeps the effective filter, as the API does.
    await wrapper
      .find('[data-testid="follow-ssp-scope"] input')
      .setValue(false);
    expect(input().value).toBe('team=payments AND repo=a');

    await submit(wrapper);
    expect(lastBody()).toMatchObject({ followSspScope: false });
  });

  it('offers a control that has enhancements, as well as its enhancements', async () => {
    catalogState.catalogs = [{ uuid: 'cat-1' }];
    catalogState.full = {
      groups: [
        {
          id: 'ac',
          title: 'Access Control',
          controls: [
            {
              id: 'ac-2',
              title: 'Account Management',
              controls: [{ id: 'ac-2.1', title: 'Automated Management' }],
            },
          ],
        },
      ],
    };
    const { wrapper } = mountCreate('ssp-9');
    await flushPromises();
    const vm = wrapper.findComponent(EvidenceFilterForm).vm as unknown as {
      controlOptions: { value: string }[];
    };
    expect(vm.controlOptions.map((o) => o.value)).toEqual(['ac-2', 'ac-2.1']);
  });
});
