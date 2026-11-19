import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { ByComponent, ImplementedRequirement } from '@/oscal';
import PartEditor from '../PartEditor.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

const api = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(async () => ({})),
  delete: vi.fn(async () => ({})),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (x: unknown) => x,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const BASE =
  '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements';

function mountEditor(
  props: Partial<InstanceType<typeof PartEditor>['$props']>,
  implementation?: ImplementedRequirement,
) {
  const reload = vi.fn(async () => undefined);
  const context = {
    sspId: () => 'ssp-1',
    implementation: () => implementation,
    component: (uuid: string) => ({ uuid, title: uuid }),
    components: () => [
      { uuid: 'okta', title: 'Okta' },
      { uuid: 'iam', title: 'IAM' },
    ],
    reload,
  } as unknown as ControlTreeContext;
  const Host = defineComponent({
    setup() {
      provideControlTree(context);
      return () =>
        h(PartEditor, {
          controlId: 'ac-2',
          byComponents: [],
          ...props,
        });
    },
  });
  const wrapper = mount(Host, {
    global: { stubs: { Tooltip: { template: '<slot />' } } },
  });
  return { wrapper, reload };
}
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text() === text)!;

describe('PartEditor', () => {
  it("updates a changed component's text, keeping its other fields", async () => {
    const bc = {
      uuid: 'bc-1',
      componentUuid: 'okta',
      description: 'Old text.',
      implementationStatus: { state: 'implemented' },
      export: { uuid: 'x', description: 'kept' },
    } as ByComponent;
    const { wrapper, reload } = mountEditor(
      {
        partId: 'ac-2_smt.a',
        statement: { uuid: 'st-1', statementId: 'ac-2_smt.a' },
        byComponents: [bc],
      },
      { uuid: 'req-1', controlId: 'ac-2' } as ImplementedRequirement,
    );
    await wrapper.get('textarea').setValue('New text.');
    await button(wrapper, 'Save').trigger('click');
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith(
      `${BASE}/req-1/statements/st-1/by-components/bc-1`,
      expect.objectContaining({
        description: 'New text.',
        export: { uuid: 'x', description: 'kept' },
      }),
      expect.anything(),
    );
    expect(reload).toHaveBeenCalled();
  });

  it('asks for the component and its text before saving a new one', async () => {
    const { wrapper } = mountEditor({
      partId: 'ac-2_smt.b',
      byComponents: [],
    });
    await button(wrapper, 'Add a component').trigger('click');
    await button(wrapper, 'Save').trigger('click');
    expect(wrapper.text()).toContain('Choose a component.');
    expect(wrapper.text()).toContain('Say how the component implements this.');
    expect(api.post).not.toHaveBeenCalled();
  });
});
