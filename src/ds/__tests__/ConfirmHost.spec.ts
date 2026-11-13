import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ConfirmationEventBus from 'primevue/confirmationeventbus';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog.vue';
import ConfirmHost from '../components/ConfirmDialog/ConfirmHost.vue';

describe('ConfirmHost', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('shows a PrimeVue confirm request as a design-system confirm and accepts it', async () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const wrapper = mount(ConfirmHost, { attachTo: document.body });
    ConfirmationEventBus.emit('confirm', {
      header: 'Delete Workflow Definition',
      message: 'This action cannot be undone.',
      acceptProps: { label: 'Delete', severity: 'danger' },
      rejectProps: { label: 'Cancel' },
      accept,
      reject,
    });
    await flushPromises();
    const dialog = wrapper.findComponent(ConfirmDialog);
    expect(dialog.props()).toMatchObject({
      open: true,
      title: 'Delete Workflow Definition',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    expect(document.body.textContent).toContain(
      'This action cannot be undone.',
    );
    dialog.vm.$emit('confirm');
    dialog.vm.$emit('update:open', false);
    await flushPromises();
    expect(accept).toHaveBeenCalledTimes(1);
    expect(reject).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('calls reject when the confirm is cancelled', async () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const wrapper = mount(ConfirmHost, { attachTo: document.body });
    ConfirmationEventBus.emit('confirm', {
      header: 'Start execution?',
      acceptProps: { label: 'Start Execution', severity: 'primary' },
      accept,
      reject,
    });
    await flushPromises();
    const dialog = wrapper.findComponent(ConfirmDialog);
    expect(dialog.props('tone')).toBe('primary');
    dialog.vm.$emit('update:open', false);
    dialog.vm.$emit('cancel');
    await flushPromises();
    expect(reject).toHaveBeenCalledTimes(1);
    expect(accept).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
