import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { errorDialog } from '@/services/error-dialog';
import ErrorDialogHost from '../components/Dialog/ErrorDialogHost.vue';

describe('ErrorDialogHost', () => {
  it('shows the app-wide error dialog and closes it', async () => {
    const wrapper = mount(ErrorDialogHost, { attachTo: document.body });
    errorDialog.show({
      summary: 'Import failed',
      detail: 'The file is not JSON.',
    });
    await flushPromises();
    expect(document.body.textContent).toContain('Import failed');
    expect(document.body.textContent).toContain('The file is not JSON.');
    const close = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Close',
    )!;
    close.click();
    await flushPromises();
    expect(document.body.textContent).not.toContain('The file is not JSON.');
    wrapper.unmount();
  });
});
