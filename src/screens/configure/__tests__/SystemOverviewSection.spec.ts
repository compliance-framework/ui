import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import SystemOverviewSection from '../SystemOverviewSection.vue';

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(
      url.endsWith('/system-characteristics')
        ? { systemName: 'Payments', securitySensitivityLevel: 'moderate' }
        : url.endsWith('/system-implementation/components')
          ? [{}, {}, {}]
          : url.includes('/system-implementation/')
            ? []
            : {
                uuid: 'ssp-1',
                metadata: { title: 'Payments SSP', version: '2.0' },
              },
    ),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('../../implementation/ProfilesField.vue', () => ({
  default: { name: 'ProfilesField', props: ['sspId'], template: '<div />' },
}));

describe('SystemOverviewSection', () => {
  it('shows the plan’s details, profiles, contents and characteristics', async () => {
    setActivePinia(createPinia());
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(SystemOverviewSection, { sspId: 'ssp-1' }),
          ),
      }),
    );
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Payments SSP');
    expect(text).toMatch(/Components\s*3/);
    expect(text).toContain('moderate');
    expect(
      wrapper.findComponent({ name: 'ProfilesField' }).props('sspId'),
    ).toBe('ssp-1');
    expect(text).not.toContain('Edit Metadata');
  });
});
