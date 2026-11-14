import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import type { Observation } from '@/oscal';
import ObservationForm from '../ObservationForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'o-9' } } })),
  put: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'o-1' } } })),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const mountForm = (observation?: Observation) =>
  mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(ObservationForm, { poamId: 'p-1', observation }),
        ),
    }),
  );

describe('ObservationForm', () => {
  it('requires a description and a method; an empty Collected means now', async () => {
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Choose at least one method.');
    await wrapper.find('textarea').setValue('Port 22 open');
    wrapper
      .findAllComponents(CheckboxGroup)[0]!
      .vm.$emit('update:modelValue', ['TEST']);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const body = (
      api.post.mock.calls[0] as unknown as [string, Observation]
    )[1];
    expect(body).toMatchObject({
      description: 'Port 22 open',
      methods: ['TEST'],
    });
    expect(Date.parse(body.collected)).not.toBeNaN();
  });

  it('shows and keeps an existing timestamp, and offers unknown methods it already has', async () => {
    const wrapper = mountForm({
      uuid: 'o-1',
      description: 'Seen',
      methods: ['EXAMINE', 'AUTOMATED'],
      collected: '2026-11-01T10:00:00Z',
    } as Observation);
    const methods = wrapper.findAllComponents(CheckboxGroup)[0]!;
    expect(
      (methods.props('options') as { value: string }[]).map((o) => o.value),
    ).toContain('AUTOMATED');
    expect(
      (wrapper.find('input[type="datetime-local"]').element as HTMLInputElement)
        .value,
    ).not.toBe('');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const body = (api.put.mock.calls[0] as unknown as [string, Observation])[1];
    expect(body.collected).toBe('2026-11-01T10:00:00.000Z');
    expect(body.methods).toEqual(['EXAMINE', 'AUTOMATED']);
  });
});
