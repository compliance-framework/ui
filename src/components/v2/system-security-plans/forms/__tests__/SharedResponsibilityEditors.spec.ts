import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type { ImplementedRequirement, Statement } from '@/oscal';
import SharedResponsibilityEditors from '../SharedResponsibilityEditors.vue';

enableAutoUnmount(afterEach);

const get = vi.fn();
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get }),
}));

const stub = (name: string) =>
  defineComponent({
    name,
    props: [
      'modelValue',
      'sspId',
      'reqId',
      'stmtId',
      'byComponentId',
      'responsibilityOptions',
      'responsibilityLabels',
      'responsibilityOptionsFailed',
    ],
    setup: () => () => h('div'),
  });
const ExportStub = stub('ByComponentExportEditor');
const InheritedStub = stub('ByComponentInheritedEditor');
const SatisfiedStub = stub('ByComponentSatisfiedEditor');

const responsibility = (uuid: string) => ({
  responsibilityUuid: uuid,
  description: `Responsibility ${uuid}`,
});

function mountEditors() {
  return mount(SharedResponsibilityEditors, {
    props: {
      sspId: 'ssp-1',
      requirement: {
        uuid: 'req-1',
        controlId: 'AC-2',
      } as ImplementedRequirement,
      statement: { uuid: 'stmt-1', statementId: 'ac-2_smt' } as Statement,
      byComponentId: 'bc-1',
      inherited: [],
    },
    global: {
      stubs: {
        ByComponentExportEditor: ExportStub,
        ByComponentInheritedEditor: InheritedStub,
        ByComponentSatisfiedEditor: SatisfiedStub,
      },
    },
  });
}

describe('SharedResponsibilityEditors', () => {
  it('wires every editor to the statement-level by-component', async () => {
    get.mockResolvedValue({ data: { data: [] } });
    const wrapper = mountEditors();
    await flushPromises();

    for (const editor of [ExportStub, InheritedStub, SatisfiedStub]) {
      expect(wrapper.findComponent(editor).props()).toMatchObject({
        sspId: 'ssp-1',
        reqId: 'req-1',
        stmtId: 'stmt-1',
        byComponentId: 'bc-1',
      });
    }
  });

  it('offers only outstanding responsibilities for this statement', async () => {
    get.mockResolvedValue({
      data: {
        data: [
          {
            controlId: 'ac-2',
            statementId: 'AC-2_SMT',
            outstandingResponsibilities: [responsibility('r-1')],
            responsibilities: [responsibility('r-1'), responsibility('r-2')],
          },
          {
            controlId: 'ac-3',
            statementId: 'ac-3_smt',
            outstandingResponsibilities: [responsibility('other')],
          },
        ],
      },
    });
    const wrapper = mountEditors();
    await flushPromises();

    expect(get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/leveraged-controls',
    );
    const satisfied = wrapper.findComponent(SatisfiedStub).props();
    expect(satisfied.responsibilityOptions).toEqual([responsibility('r-1')]);
    expect(satisfied.responsibilityLabels).toEqual([
      responsibility('r-1'),
      responsibility('r-2'),
    ]);
    expect(satisfied.responsibilityOptionsFailed).toBe(false);
  });

  it('reports a failed load instead of "nothing to satisfy"', async () => {
    get.mockRejectedValue(new Error('network'));
    const wrapper = mountEditors();
    await flushPromises();

    const satisfied = wrapper.findComponent(SatisfiedStub).props();
    expect(satisfied.responsibilityOptions).toEqual([]);
    expect(satisfied.responsibilityOptionsFailed).toBe(true);
  });
});
