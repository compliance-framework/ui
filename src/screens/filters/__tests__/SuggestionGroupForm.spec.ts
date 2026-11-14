import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { DashboardSuggestion } from '@/views/dashboard/partials/dashboard-suggestions';
import SuggestionGroupForm from '../SuggestionGroupForm.vue';

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true }),
}));

const suggestion = (id: string, controlId: string): DashboardSuggestion => ({
  id,
  status: 'pending',
  controlId,
  controlCatalogId: 'cat-1',
  labelSetHash: 'hash-1',
  proposedFilterName: 'AI name',
  proposedFilterLabelSet: { env: 'prod' },
});

function mountForm() {
  const saved: unknown[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SuggestionGroupForm, {
            group: {
              hash: 'filter:env=prod',
              labels: ['env=prod'],
              suggestions: [
                suggestion('id-1', 'AC-1'),
                suggestion('id-2', 'AC-2'),
              ],
            },
            controlOptions: [
              { label: 'AC-1', value: 'AC-1', controlId: 'AC-1' },
              { label: 'AC-2', value: 'AC-2', controlId: 'AC-2' },
              { label: 'AC-3', value: 'AC-3', controlId: 'AC-3' },
            ],
            resolveCatalogId: () => 'cat-1',
            onSave: (payload: unknown) => saved.push(payload),
          }),
        ),
    }),
  );
  return { wrapper, saved };
}

const field = (wrapper: ReturnType<typeof mount>, label: string, nth = 0) => {
  const el = wrapper.findAll('label').filter((l) => l.text() === label)[nth]!;
  return wrapper.find(`[id="${el.attributes('for')}"]`);
};

describe('SuggestionGroupForm', () => {
  it('saves overridden labels and title, with added and removed controls', async () => {
    const { wrapper, saved } = mountForm();
    await field(wrapper, 'Value').setValue('staging');
    await field(wrapper, 'Title').setValue('Staging payments');
    await field(wrapper, 'AC-2').setValue(false);
    (
      wrapper.findComponent(SuggestionGroupForm).vm as unknown as {
        controlToAdd: string;
      }
    ).controlToAdd = 'AC-3';
    await nextTick();
    expect(wrapper.text()).toContain('AC-3');
    await wrapper.find('form').trigger('submit');
    expect(saved).toEqual([
      {
        ids: ['id-1', 'id-2'],
        proposedFilterName: 'Staging payments',
        proposedFilterLabelSet: { env: 'staging' },
        addControlKeys: ['cat-1:AC-3'],
        removeIds: ['id-2'],
      },
    ]);
  });

  it('needs a label and a control to save', async () => {
    const { wrapper, saved } = mountForm();
    await field(wrapper, 'AC-1').setValue(false);
    await field(wrapper, 'AC-2').setValue(false);
    await wrapper.find('form').trigger('submit');
    expect(saved).toEqual([]);
  });
});
