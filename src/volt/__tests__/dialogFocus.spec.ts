import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import Dialog from '@/volt/Dialog.vue';

describe('Dialog keyboard affordances', () => {
  it('renders autofocus close controls on V2 routes', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/v2',
          component: { template: '<div />' },
          meta: { uiVersion: 'v2' },
        },
      ],
    });

    await router.push('/v2');
    await router.isReady();

    const wrapper = mount(
      {
        components: { Dialog },
        template: `
          <Dialog v-model:visible="visible" modal header="Keyboard Check" :style="{ width: '24rem' }">
            <p>Body</p>
          </Dialog>
        `,
        data() {
          return {
            visible: true,
          };
        },
      },
      {
        attachTo: document.body,
        global: {
          plugins: [router],
        },
      },
    );

    await nextTick();

    const autofocusButtons = document.querySelectorAll('button[autofocus]');
    expect(autofocusButtons.length).toBeGreaterThan(0);

    const className = autofocusButtons[0].getAttribute('class') || '';
    expect(className).toContain('ui-v2-radius-none');

    wrapper.unmount();
  });
});
