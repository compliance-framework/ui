import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import { useConfirm } from 'primevue/useconfirm';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';

let wrapper: VueWrapper | undefined;
afterEach(() => wrapper?.unmount());

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));

async function openConfirm(severity?: string) {
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

  let confirm!: ReturnType<typeof useConfirm>;
  const Host = defineComponent({
    setup() {
      confirm = useConfirm();
      return () => h(ConfirmDialog);
    },
  });
  wrapper = mount(Host, {
    attachTo: document.body,
    global: {
      plugins: [router, [PrimeVue, { unstyled: true }], ConfirmationService],
    },
  });

  confirm.require({
    header: 'Delete filter',
    message: 'Delete this filter?',
    acceptProps: { label: 'Delete', ...(severity ? { severity } : {}) },
    rejectProps: { label: 'Cancel' },
  });
  await nextTick();
  await nextFrame();
  await nextFrame();
}

describe('V2 confirm dialog focus', () => {
  it('opens destructive confirmations on Cancel', async () => {
    await openConfirm('danger');

    expect(
      (document.activeElement as HTMLElement | null)?.textContent?.trim(),
    ).toBe('Cancel');
    expect(document.body.textContent).toContain('ESC OR ENTER TO CANCEL');
  });

  it('opens non-destructive confirmations on the confirm action', async () => {
    await openConfirm();

    expect(
      (document.activeElement as HTMLElement | null)?.textContent?.trim(),
    ).toBe('Delete');
  });
});
