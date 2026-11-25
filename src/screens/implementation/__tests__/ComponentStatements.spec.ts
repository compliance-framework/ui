import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { ByComponent } from '@/oscal';
import ComponentStatements from '../ComponentStatements.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

const byComponents = [
  {
    uuid: 'bc-1',
    componentUuid: 'okta',
    description: 'Okta enforces MFA.',
    implementationStatus: { state: 'implemented' },
  },
  {
    uuid: 'bc-2',
    componentUuid: 'aws',
    description: 'IAM users are federated.',
    implementationStatus: { state: 'partial' },
  },
] as unknown as ByComponent[];

function mountStatements(
  filters: unknown[],
  items: ByComponent[] = byComponents,
  inherited: (uuid: string) => unknown = () => undefined,
) {
  const context = {
    component: (uuid: string) => ({
      title: { okta: 'Okta', aws: 'AWS' }[uuid] ?? 'Platform',
    }),
    filters: () => filters,
    inherited,
    upstreamLink: () => ({ name: 'system-implementation' }),
  } as unknown as ControlTreeContext;
  const Host = defineComponent({
    setup() {
      provideControlTree(context);
      return () =>
        h(ComponentStatements, { controlId: 'ac-2', byComponents: items });
    },
  });
  return mount(Host, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
}

const rows = (wrapper: ReturnType<typeof mountStatements>) =>
  wrapper.findAll('li').map((li) => li.text());

describe('ComponentStatements', () => {
  it('marks a component with evidence only when a filter links the control and the component', () => {
    const wrapper = mountStatements([
      { id: 'f1', name: 'MFA', components: [{ uuid: 'okta' }] },
      { id: 'f2', name: 'Control only', components: [] },
    ]);
    const [okta, aws] = rows(wrapper);
    expect(okta).toMatch(/Okta\s*Implemented\s*Evidence/);
    expect(aws).not.toContain('Evidence');
  });

  it('counts the filters when several link the component', () => {
    const wrapper = mountStatements([
      { id: 'f1', name: 'MFA', components: [{ uuid: 'okta' }] },
      { id: 'f2', name: 'SSO', components: [{ uuid: 'okta' }] },
    ]);
    expect(rows(wrapper)[0]).toContain('Evidence (2 filters)');
  });

  it('shows an inherited implementation in place of a component statement', () => {
    const upstream = {
      uuid: 'bc-up',
      componentUuid: 'platform',
      description: '',
    } as unknown as ByComponent;
    const wrapper = mountStatements([], [byComponents[0]!, upstream], (uuid) =>
      uuid === 'bc-up'
        ? {
            upstreamSspId: 'up-1',
            offeringTitle: 'Shared capabilities',
            offeringVersion: 1,
            status: 'active',
            provided: 'Zone capacity.',
            responsibilities: [],
          }
        : undefined,
    );
    const [own, inherited] = rows(wrapper);
    expect(own).toContain('Okta enforces MFA.');
    expect(inherited).toMatch(
      /Inherited from Platform.*Shared capabilities, version 1.*Zone capacity\./,
    );
  });
});
