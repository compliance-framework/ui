import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ByComponentResponsibilities from '../ByComponentResponsibilities.vue';
import type { ByComponent } from '@/oscal';

function mountWith(byComponent: Partial<ByComponent>) {
  return mount(ByComponentResponsibilities, {
    props: {
      byComponent: {
        uuid: 'bc-1',
        componentUuid: 'comp-1',
        description: '',
        ...byComponent,
      } as ByComponent,
    },
  });
}

describe('ByComponentResponsibilities', () => {
  it('lists what the component provides, leaves to importers and inherits', () => {
    const wrapper = mountWith({
      export: {
        provided: [{ uuid: 'p-1', description: 'We run the IdP' }],
        responsibilities: [
          {
            uuid: 'r-1',
            providedUuid: 'p-1',
            description: 'You review access',
          },
        ],
      },
      inherited: [
        { uuid: 'i-1', providedUuid: 'up-1', description: 'Platform patches' },
      ],
    } as Partial<ByComponent>);

    const text = wrapper.text();
    expect(text).toContain('ProvidesWe run the IdP');
    expect(text).toContain(
      'Leaves to the systems that import itYou review access',
    );
    expect(text).toContain('InheritsPlatform patches');
  });

  it("doesn't show satisfied notes, which belong to Inherited responsibilities", () => {
    const wrapper = mountWith({
      satisfied: [
        { uuid: 's-1', responsibilityUuid: 'r-1', description: 'We do it' },
      ],
    } as Partial<ByComponent>);

    expect(wrapper.text()).toBe('');
  });

  it('renders nothing for a component that shares nothing', () => {
    expect(mountWith({}).text()).toBe('');
  });
});
