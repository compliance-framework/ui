import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { ImplementedRequirement } from '@/oscal';
import type { PartBand } from '../controlParts';
import { provideControlTree, type ControlTreeContext } from '../controlTree';
import { useImplementationRequired } from '../useImplementationRequired';

const api = vi.hoisted(() => ({
  post: vi.fn(async () => ({ data: { data: { uuid: 'req-new' } } })),
  put: vi.fn(async () => ({})),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (x: unknown) => x,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const BASE =
  '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements';
const MARK = {
  ns: 'https://compliance-framework.github.io/ns/oscal',
  name: 'implementation-required',
  value: 'false',
};

function setup(implementation?: ImplementedRequirement) {
  let result!: ReturnType<typeof useImplementationRequired>;
  const reload = vi.fn(async () => undefined);
  const Host = defineComponent({
    setup() {
      provideControlTree({
        sspId: () => 'ssp-1',
        implementation: () => implementation,
        reload,
      } as unknown as ControlTreeContext);
      return () =>
        h(
          defineComponent({
            setup() {
              result = useImplementationRequired();
              return () => null;
            },
          }),
        );
    },
  });
  mount(Host);
  return { result, reload };
}

const band = (statement?: PartBand['statement']): PartBand => ({
  id: 'ac-2_smt.h',
  text: '',
  label: 'h.',
  prose: '',
  depth: 0,
  statement,
  required: true,
});

describe('useImplementationRequired', () => {
  it('marks an existing statement, keeping the rest of it', async () => {
    const statement = {
      uuid: 'st-h',
      statementId: 'ac-2_smt.h',
      remarks: 'Kept.',
      props: [{ name: 'other', value: 'x' }],
    };
    const { result, reload } = setup({
      uuid: 'req-1',
      controlId: 'ac-2',
    } as ImplementedRequirement);
    await result.setRequired('ac-2', band(statement), false);
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith(
      `${BASE}/req-1/statements/st-h`,
      { ...statement, props: [{ name: 'other', value: 'x' }, MARK] },
      expect.anything(),
    );
    expect(reload).toHaveBeenCalled();
  });

  it('creates the implementation and the statement when there are none', async () => {
    api.post.mockClear();
    const { result } = setup(undefined);
    await result.setRequired('ac-2', band(), false);
    await flushPromises();
    expect(api.post).toHaveBeenNthCalledWith(
      1,
      BASE,
      expect.objectContaining({ controlId: 'ac-2' }),
      expect.anything(),
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      `${BASE}/req-new/statements`,
      expect.objectContaining({ statementId: 'ac-2_smt.h', props: [MARK] }),
      expect.anything(),
    );
  });
});
