import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import SubjectTemplateScreen from '../SubjectTemplateScreen.vue';

const urls = vi.hoisted(() => [] as string[]);
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => {
    urls.push(url);
    return {
      data: ref({
        id: 'st-1',
        name: 'Kubernetes deployment',
        type: 'component',
        sourceMode: 'manual',
        displayPriority: 5,
        titleTemplate: '{{ .namespace }}/{{ .name }}',
        identityLabelKeys: ['cluster', 'namespace'],
        selectorLabels: [{ key: 'kind', value: 'deployment' }],
        labelSchema: [{ key: 'cluster', description: 'Cluster name' }],
        props: [{ name: 'lifecycle', value: 'production' }],
        links: [{ href: 'https://example.com/runbook', text: 'Runbook' }],
      }),
      error: ref(undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      execute: vi.fn(() => Promise.resolve()),
    };
  },
}));

describe('SubjectTemplateScreen', () => {
  it('fetches the template for the route and shows its details, labels and Edit', async () => {
    const Stub = { render: () => null };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/admin/subject-templates/:id',
          component: SubjectTemplateScreen,
        },
        {
          path: '/admin/subject-templates',
          name: 'admin-subject-templates',
          component: Stub,
        },
      ],
    });
    await router.push('/admin/subject-templates/st-1');
    await router.isReady();
    const wrapper = mount(
      defineComponent({
        render: () => h(TooltipProvider, null, () => h(SubjectTemplateScreen)),
      }),
      { global: { plugins: [router] } },
    );
    await flushPromises();
    expect(urls).toContain('/api/admin/subject-templates/st-1');
    const text = wrapper.text();
    expect(text).toContain('Kubernetes deployment');
    expect(text).toContain('{{ .namespace }}/{{ .name }}');
    expect(text).toContain('kind: deployment');
    expect(text).toContain('Cluster name');
    expect(text).toContain('lifecycle: production');
    expect(wrapper.find('a[href="https://example.com/runbook"]').text()).toBe(
      'Runbook',
    );
    expect(
      wrapper.find('a[href="/admin/subject-templates?edit=st-1"]').exists(),
    ).toBe(true);
  });
});
