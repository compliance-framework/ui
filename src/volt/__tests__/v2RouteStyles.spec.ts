import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import Button from '@/volt/Button.vue';
import DataTable from '@/volt/DataTable.vue';
import Column from '@/volt/Column.vue';

async function mountWithRoute(component: object, routePath: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/v1',
        component: { template: '<div />' },
      },
      {
        path: '/v2',
        component: { template: '<div />' },
        meta: {
          uiVersion: 'v2',
        },
      },
    ],
  });

  await router.push(routePath);
  await router.isReady();

  return mount(component, {
    global: {
      plugins: [router],
    },
  });
}

describe('route-aware V2 styles in volt wrappers', () => {
  it('applies V2 button classes on V2 routes', async () => {
    const wrapper = await mountWithRoute(
      {
        components: { Button },
        template: '<Button>Run</Button>',
      },
      '/v2',
    );

    const className = wrapper.find('button').attributes('class');
    expect(className).toContain('var(--ui-v2-primary)');
    expect(className).toContain('rounded-none');
  });

  it('keeps legacy button styles on non-V2 routes', async () => {
    const wrapper = await mountWithRoute(
      {
        components: { Button },
        template: '<Button>Run</Button>',
      },
      '/v1',
    );

    const className = wrapper.find('button').attributes('class');
    expect(className).toContain('bg-primary');
    expect(className).not.toContain('var(--ui-v2-primary)');
  });

  it('applies V2 table classes on V2 routes', async () => {
    const rows = [
      { id: 'U-1', name: 'Alice' },
      { id: 'U-2', name: 'Bob' },
    ];

    const wrapper = await mountWithRoute(
      {
        components: { DataTable, Column },
        data() {
          return { rows };
        },
        template: `
          <div>
            <DataTable :value="rows">
              <Column field="id" header="ID" />
              <Column field="name" header="Name" />
            </DataTable>
          </div>
        `,
      },
      '/v2',
    );

    expect(wrapper.html()).toContain('var(--ui-v2-border)');
    expect(wrapper.find('table').exists()).toBe(true);
  });
});
