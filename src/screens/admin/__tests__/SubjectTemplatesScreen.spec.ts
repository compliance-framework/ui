import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import SubjectTemplatesScreen from '../SubjectTemplatesScreen.vue';

const TEMPLATES = [
  {
    id: 't-1',
    name: 'GitHub Organization',
    type: 'component',
    sourceMode: 'runtime-derived',
  },
  {
    id: 't-2',
    name: 'Kubernetes cluster',
    type: 'inventory-item',
    sourceMode: 'manual',
  },
  {
    id: 't-3',
    name: 'GitHub Organization (Copy)',
    type: 'component',
    sourceMode: 'manual',
  },
];
vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref(TEMPLATES),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const formProps = vi.hoisted(() => ({ last: undefined as unknown }));

async function mountScreen(path = '/admin/subject-templates') {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/subject-templates',
        name: 'admin-subject-templates',
        component: SubjectTemplatesScreen,
      },
      {
        path: '/admin/subject-templates/:id',
        name: 'admin-subject-template-detail',
        component: Stub,
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(SubjectTemplatesScreen)),
    }),
    {
      global: {
        plugins: [router],
        stubs: {
          SubjectTemplateForm: {
            props: ['initial', 'templateId'],
            setup(props: Record<string, unknown>) {
              formProps.last = props;
              return () => null;
            },
          },
        },
      },
      attachTo: document.body,
    },
  );
  await flushPromises();
  return { wrapper, router };
}

const names = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('tbody tr').map((row) => row.find('th, td').text());

describe('SubjectTemplatesScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    formProps.last = undefined;
  });

  it('lists templates sorted by name, linking each to its page', async () => {
    const { wrapper } = await mountScreen();
    expect(names(wrapper)).toEqual([
      'GitHub Organization',
      'GitHub Organization (Copy)',
      'Kubernetes cluster',
    ]);
    expect(
      wrapper.find('a[href="/admin/subject-templates/t-2"]').exists(),
    ).toBe(true);
    wrapper.unmount();
  });

  it('filters by search, type and source mode from the address', async () => {
    const { wrapper } = await mountScreen(
      '/admin/subject-templates?q=github&type=component&source=manual',
    );
    expect(names(wrapper)).toEqual(['GitHub Organization (Copy)']);
    wrapper.unmount();
  });

  it('duplicates with a unique copy name', async () => {
    const { wrapper } = await mountScreen();
    const menu = wrapper
      .findAllComponents(Menu)
      .find((m) => m.props('label') === 'Actions for GitHub Organization')!;
    (menu.props('items') as MenuAction[]).find((i) => i.label === 'Duplicate')!
      .onSelect!();
    await flushPromises();
    const props = formProps.last as {
      initial: { name: string };
      templateId?: string;
    };
    expect(props.initial.name).toBe('GitHub Organization (Copy 2)');
    expect(props.templateId).toBeUndefined();
    wrapper.unmount();
  });

  it('opens the editor for ?edit=<id> and clears it from the address', async () => {
    const { wrapper, router } = await mountScreen(
      '/admin/subject-templates?edit=t-2',
    );
    expect((formProps.last as { templateId: string }).templateId).toBe('t-2');
    expect(router.currentRoute.value.query.edit).toBeUndefined();
    wrapper.unmount();
  });
});
