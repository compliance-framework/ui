import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import type { Task } from '@/oscal';
import TaskForm from '../TaskForm.vue';

const api = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: () => ({
    data: ref([
      { uuid: 't-1', title: 'Scan', type: 'action' },
      { uuid: 't-2', title: 'Interview', type: 'action' },
    ]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

function mountForm(task?: Task) {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(TaskForm, { assessmentPlanId: 'ap-1', task }),
        ),
    }),
    { attachTo: document.body },
  );
}

describe('TaskForm', () => {
  beforeEach(() => {
    // jsdom has no scrollIntoView; the segmented radio group calls it.
    Element.prototype.scrollIntoView = vi.fn();
    api.post.mockReset().mockResolvedValue({ data: { data: { uuid: 'new' } } });
    api.put.mockReset().mockResolvedValue({ data: { data: { uuid: 't-1' } } });
  });

  it('asks for a title and type, then adds an unscheduled task', async () => {
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a title.');
    expect(api.post).not.toHaveBeenCalled();
    const [title, type] = wrapper.findAll('input');
    await title!.setValue('Quarterly scan');
    await type!.setValue('action');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0]!;
    expect(url).toBe('/api/oscal/assessment-plans/ap-1/tasks');
    expect(body).toMatchObject({
      title: 'Quarterly scan',
      type: 'action',
      timing: undefined,
    });
    expect(wrapper.findComponent(TaskForm).emitted('created')).toHaveLength(1);
    wrapper.unmount();
  });

  it('edits timing and dependencies, keeping dependency remarks', async () => {
    const wrapper = mountForm({
      uuid: 't-1',
      title: 'Scan',
      type: 'action',
      timing: { onDate: '2026-12-01T00:00:00Z' },
      dependencies: [{ taskUuid: 't-2', remarks: 'after the interview' }],
    });
    expect(wrapper.findComponent(RadioGroup).props('modelValue')).toBe(
      'onDate',
    );
    const deps = wrapper.findComponent(CheckboxGroup);
    expect(
      (deps.props('options') as { value: string }[]).map((o) => o.value),
    ).toEqual(['t-2']);
    wrapper
      .findComponent(RadioGroup)
      .vm.$emit('update:modelValue', 'atFrequency');
    await flushPromises();
    await wrapper.findAll('input[type="number"]')[0]!.setValue('3');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.put.mock.calls[0]!;
    expect(url).toBe('/api/oscal/assessment-plans/ap-1/tasks/t-1');
    expect(body).toMatchObject({
      timing: { atFrequency: { period: '3', unit: 'months' } },
      dependencies: [{ taskUuid: 't-2', remarks: 'after the interview' }],
    });
    expect(wrapper.findComponent(TaskForm).emitted('updated')).toHaveLength(1);
    wrapper.unmount();
  });
});
