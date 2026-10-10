import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ConfigYamlViewer from '../ConfigYamlViewer.vue';
import { globalWith, piniaWith, READER } from './helpers';

function mountViewer(doc: object | null) {
  return mount(ConfigYamlViewer, {
    props: {
      doc,
      filename: 'agent-overlay-r7.yaml',
      emptyText: 'Nothing here.',
      legend: 'Locked.',
    },
    global: globalWith(piniaWith(READER)),
  });
}

describe('ConfigYamlViewer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders YAML with the legend', () => {
    const wrapper = mountViewer({
      verbosity: 1,
      plugins: { a: { policy_data: { max_auth_tries: 3 } } },
    });
    const text = wrapper.find('[data-test="yaml-text"]').text();
    expect(text).toContain('verbosity: 1');
    expect(text).toContain('max_auth_tries: 3');
    expect(wrapper.text()).toContain('Locked.');
  });

  it('copies to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const wrapper = mountViewer({ verbosity: 1 });
    await wrapper.find('[data-test="yaml-copy"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith('verbosity: 1\n');
  });

  it('downloads a YAML blob with the given filename', async () => {
    const created = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    let downloadName = '';
    click.mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });
    const wrapper = mountViewer({ verbosity: 1 });
    await wrapper.find('[data-test="yaml-download"]').trigger('click');
    expect(created).toHaveBeenCalled();
    const blob = created.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/yaml');
    expect(downloadName).toBe('agent-overlay-r7.yaml');
  });

  it('shows the empty text and disables actions without a document', () => {
    const wrapper = mountViewer(null);
    expect(wrapper.find('[data-test="yaml-empty"]').text()).toBe(
      'Nothing here.',
    );
    expect(
      wrapper.find('[data-test="yaml-copy"]').attributes('disabled'),
    ).toBeDefined();
    expect(
      wrapper.find('[data-test="yaml-download"]').attributes('disabled'),
    ).toBeDefined();
  });
});
