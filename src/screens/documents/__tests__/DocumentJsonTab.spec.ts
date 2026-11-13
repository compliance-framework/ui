import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import DocumentJsonTab from '../DocumentJsonTab.vue';

const requested = vi.hoisted(() => [] as string[]);
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => {
    requested.push(url);
    return {
      data: ref({
        uuid: 'p-1',
        metadata: { title: 'Base', lastModified: 'x' },
      }),
      error: ref(undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      execute: vi.fn(() => Promise.resolve()),
    };
  },
}));

// CodeBlock reports copy results through the global toast.
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('DocumentJsonTab', () => {
  it('shows the full document for the route’s type as kebab-case OSCAL JSON', async () => {
    setActivePinia(createPinia());
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/plan-of-action-and-milestones/:id/json',
          name: 'plan-of-action-and-milestones-json',
          component: DocumentJsonTab,
        },
      ],
    });
    await router.push('/plan-of-action-and-milestones/p-1/json');
    await router.isReady();
    const wrapper = mount(
      defineComponent({
        render: () => h(TooltipProvider, null, () => h(DocumentJsonTab)),
      }),
      { global: { plugins: [router] } },
    );
    await flushPromises();
    expect(requested).toContain(
      '/api/oscal/plan-of-action-and-milestones/p-1/full',
    );
    expect(wrapper.find('pre').text()).toContain('"last-modified": "x"');
    expect(wrapper.text()).toContain('Base-poam.json');
  });
});
