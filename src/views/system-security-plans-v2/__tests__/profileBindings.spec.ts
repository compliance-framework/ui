import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, inject, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import Editor from '../SystemSecurityPlanEditorView.vue';
import {
  sspDetailProfileBindingKey,
  type SspDetailProfileBinding,
} from '../sspDetailProfileBinding';

const mocks = vi.hoisted(() => ({
  listProfiles: vi.fn(),
  addProfile: vi.fn(),
  removeProfile: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: mocks.toast }),
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));
vi.mock('@/stores/system', () => ({
  useSystemStore: () => ({ system: {}, setSecurityPlan: vi.fn() }),
}));
vi.mock('@/stores/system-security-plans', () => ({
  useSystemSecurityPlanStore: () => mocks,
}));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string | null) => ({
    data: ref(
      url === '/api/oscal/profiles'
        ? [
            { uuid: 'p-1', metadata: { title: 'Profile One' } },
            { uuid: 'p-2', metadata: { title: 'Profile Two' } },
          ]
        : { uuid: 'ssp-1', metadata: { title: 'Test System' } },
    ),
    isLoading: ref(false),
    error: ref(null),
    execute: vi.fn(),
  }),
}));

let scope: SspDetailProfileBinding;
const ScopeProbe = defineComponent({
  setup() {
    scope = inject(sspDetailProfileBindingKey)!;
    return () => h('div');
  },
});

async function mountEditor() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/ssp/:id', component: { template: '<div />' } }],
  });
  await router.push('/ssp/ssp-1');
  await router.isReady();
  const wrapper = mount(Editor, {
    global: {
      plugins: [router],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        RouterView: ScopeProbe,
        MultiSelect: {
          name: 'MultiSelect',
          props: ['modelValue'],
          template: '<div />',
        },
        PrimaryButton: { template: '<button><slot /></button>' },
        V2LucideIcon: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('remake SSP profile bindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listProfiles.mockResolvedValue({
      data: [
        { uuid: 'p-1', title: 'Profile One' },
        { uuid: 'p-2', title: 'Profile Two' },
      ],
    });
  });

  it('loads every binding and switches compliance scope without changing bindings', async () => {
    const wrapper = await mountEditor();
    expect(scope.profileItems.value.map((item) => item.value)).toEqual([
      'p-1',
      'p-2',
    ]);
    expect(scope.selectedProfileId.value).toBe('p-1');
    expect(await scope.selectProfile('p-2')).toBe(true);
    expect(scope.selectedProfileId.value).toBe('p-2');
    expect(mocks.addProfile).not.toHaveBeenCalled();
    expect(mocks.removeProfile).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('removes only the deselected profile and keeps the remaining scope valid', async () => {
    const wrapper = await mountEditor();
    wrapper
      .findComponent({ name: 'MultiSelect' })
      .vm.$emit('update:modelValue', ['p-2']);
    await flushPromises();
    expect(mocks.removeProfile).toHaveBeenCalledWith('ssp-1', 'p-1');
    expect(mocks.addProfile).not.toHaveBeenCalled();
    expect(scope.selectedProfileId.value).toBe('p-2');
    wrapper.unmount();
  });
});
