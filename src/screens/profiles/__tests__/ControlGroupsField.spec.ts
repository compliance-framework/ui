import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import type { ProfileSelectControlByID } from '@/oscal';
import ControlGroupsField from '../ControlGroupsField.vue';

vi.mock('@/composables/useControlOptions', () => ({
  useControlOptions: () => ({
    options: ref([
      { value: 'ac-1', label: 'ac-1 Policy' },
      { value: 'ac-2', label: 'ac-2 Account management' },
    ]),
    loading: ref(false),
  }),
}));

function mountField(groups: ProfileSelectControlByID[]) {
  const model = ref(groups);
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(ControlGroupsField, {
            groups: model.value,
            'onUpdate:groups': (next: ProfileSelectControlByID[]) =>
              (model.value = next),
            catalog: 'cat-1',
            kind: 'Included',
          }),
        ),
    }),
    { attachTo: document.body },
  );
  return { wrapper, model };
}

const button = (label: string) =>
  [...document.querySelectorAll('button')].find((b) =>
    b.textContent?.trim().startsWith(label),
  )!;

describe('ControlGroupsField', () => {
  it('adds a chosen control to a group, offering only controls not already in it', async () => {
    const { wrapper, model } = mountField([{ withIds: ['ac-1'] }]);
    const picker = wrapper.findComponent(Combobox);
    expect(
      (picker.props('options') as { value: string }[]).map((o) => o.value),
    ).toEqual(['ac-2']);
    picker.vm.$emit('update:modelValue', 'ac-2');
    await flushPromises();
    button('Add').click();
    await flushPromises();
    expect(model.value).toEqual([{ withIds: ['ac-1', 'ac-2'] }]);
    wrapper.unmount();
  });

  it('removes a control, removes a group and adds a new one', async () => {
    const { wrapper, model } = mountField([{ withIds: ['ac-1', 'ac-2'] }]);
    (
      document.querySelector(
        '[aria-label="Remove ac-1 from included group 1"]',
      ) as HTMLButtonElement
    ).click();
    await flushPromises();
    expect(model.value).toEqual([{ withIds: ['ac-2'] }]);
    button('New included group').click();
    await flushPromises();
    expect(model.value).toHaveLength(2);
    button('Remove group').click();
    await flushPromises();
    expect(model.value).toEqual([{ withIds: [] }]);
    wrapper.unmount();
  });
});
