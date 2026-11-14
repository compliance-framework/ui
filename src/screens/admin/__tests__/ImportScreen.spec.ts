import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import FileField from '@/ds/components/FileField/FileField.vue';
import ImportScreen from '../ImportScreen.vue';

const api = vi.hoisted(() => ({ post: vi.fn() as ReturnType<typeof vi.fn> }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

function mountScreen() {
  return mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(ImportScreen)),
    }),
    {
      attachTo: document.body,
      global: { stubs: { WorkflowImportPanel: true } },
    },
  );
}

const oscalForm = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('form')[0]!;

describe('ImportScreen', () => {
  beforeEach(() => {
    api.post = vi.fn();
  });

  it('asks for files, then posts them and lists a result per file', async () => {
    api.post.mockResolvedValue({
      data: {
        data: {
          totalFiles: 1,
          successfulCount: 1,
          failedCount: 0,
          results: [
            {
              filename: 'cat.json',
              success: true,
              message: 'Imported.',
              type: 'catalog',
              title: 'NIST 800-53',
            },
          ],
        },
      },
    });
    const wrapper = mountScreen();
    await oscalForm(wrapper).trigger('submit');
    expect(wrapper.text()).toContain('Choose at least one file.');
    expect(api.post).not.toHaveBeenCalled();

    wrapper
      .findAllComponents(FileField)[0]!
      .vm.$emit('update:files', [new File(['{}'], 'cat.json')]);
    await flushPromises();
    await oscalForm(wrapper).trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0]!;
    expect(url).toBe('/api/oscal/import');
    expect((body as FormData).getAll('files')).toHaveLength(1);
    expect(wrapper.text()).toContain('Imported. catalog: NIST 800-53.');
    wrapper.unmount();
  });

  it('shows per-file failures when every file fails (the API answers 400)', async () => {
    const failure = Object.assign(
      new Error('Request failed with status code 400'),
      {
        response: {
          status: 400,
          data: {
            data: {
              totalFiles: 1,
              successfulCount: 0,
              failedCount: 1,
              results: [
                {
                  filename: 'bogus.json',
                  success: false,
                  message: 'Unsupported OSCAL document type: x',
                },
              ],
            },
          },
        },
      },
    );
    // A plain function, not a spy: Vitest reported this rejection from the spy's own bookkeeping
    // even though the screen awaits and handles it.
    let posted = 0;
    api.post = (async () => {
      posted += 1;
      throw failure;
    }) as unknown as typeof api.post;
    const wrapper = mountScreen();
    wrapper
      .findAllComponents(FileField)[0]!
      .vm.$emit('update:files', [new File(['{}'], 'bogus.json')]);
    await flushPromises();
    await oscalForm(wrapper).trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('bogus.json');
    expect(wrapper.text()).toContain('Unsupported OSCAL document type: x');
    expect(posted).toBe(1);
    wrapper.unmount();
  });
});
