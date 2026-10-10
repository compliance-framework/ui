import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils';
import SubjectsSection from '../SubjectsSection.vue';
import type { SubjectReference } from '@/oscal';
import { CCF_OSCAL_NAMESPACE } from '@/types/subjects';

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock('@/composables/subjects/useSubjectSearch', () => ({
  useSubjectSearch: () => ({ lookup: lookupMock }),
}));

const ccf = (name: string, value: string) => ({
  ns: CCF_OSCAL_NAMESPACE,
  name,
  value,
});

const templateSubject: SubjectReference = {
  subjectUuid: 'dc-1',
  type: 'component',
  title: 'GitHub Organization: acme',
  props: [
    ccf('subject-source', 'template'),
    ccf('subject-template', 'github-organization'),
    ccf('display-priority', '0'),
  ],
  links: [
    { href: 'https://example.com/other', rel: 'alternate' },
    { href: 'https://github.com/acme', rel: 'canonical' },
  ],
};
const declaredSubject: SubjectReference = {
  subjectUuid: 'party-1',
  type: 'party',
  title: 'Network Team',
  props: [ccf('subject-source', 'declared')],
  links: [{ href: 'javascript:alert(1)' }],
};
const legacySubject: SubjectReference = {
  subjectUuid: 'legacy-1',
  type: 'Component',
  props: [ccf('subject-source', 'legacy')],
};

// The value shown next to a label in a subject block.
function definition(
  block: Pick<DOMWrapper<Element>, 'findAll'>,
  label: string,
) {
  const term = block.findAll('dt').find((dt) => dt.text() === label);
  return term?.element.nextElementSibling?.textContent?.trim();
}

function mountCard(subjectReferences: SubjectReference[]) {
  return mount(SubjectsSection, {
    props: { subjectReferences },
    global: {
      directives: {
        tooltip: {
          mounted(el: HTMLElement, binding: { value: string }) {
            el.setAttribute('data-tooltip', binding.value);
          },
        },
      },
      stubs: {
        BIconExclamationTriangle: { template: '<span />' },
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="JSON.stringify(to)"><slot /></a>',
        },
      },
    },
  });
}

describe('SubjectsSection', () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockResolvedValue([
      {
        subjectUuid: 'dc-1',
        type: 'component',
        kind: 'defined-component',
        title: 'GitHub Organization: acme',
        context: 'github-settings components',
        identity: [{ key: 'organization', value: 'acme' }],
        linkedSsps: [
          {
            sspId: 'ssp-1',
            sspTitle: 'Payments Platform',
            componentId: 'sc-1',
            componentTitle: 'GitHub',
          },
        ],
      },
      {
        subjectUuid: 'party-1',
        type: 'party',
        kind: 'party',
        title: 'Network Team',
      },
    ]);
  });

  it('shows each subject in order, without legacy subjects', async () => {
    const wrapper = mountCard([
      templateSubject,
      declaredSubject,
      legacySubject,
    ]);
    await flushPromises();

    expect(lookupMock).toHaveBeenCalledWith(['dc-1', 'party-1']);
    const blocks = wrapper.findAll('[data-testid="subject-block"]');
    expect(blocks).toHaveLength(2);

    const org = blocks[0]!;
    expect(org.text()).toContain('GitHub Organization: acme');
    expect(org.text(), 'no kind line').not.toContain('Defined component');
    expect(definition(org, 'Linked in SSPs:')).toBe(
      'Payments Platform → "GitHub"',
    );
    const title = org.get('[data-testid="subject-title"]');
    expect(title.classes(), 'long titles are cut short').toContain('truncate');
    expect(title.attributes('data-tooltip'), 'hover shows the full title').toBe(
      'GitHub Organization: acme',
    );
    const titleLink = org.get('a[target="_blank"]');
    expect(titleLink.text()).toBe('GitHub Organization: acme');
    expect(titleLink.attributes('href')).toBe('https://github.com/acme');
    expect(titleLink.attributes('rel')).toBe('noopener noreferrer');
    expect(org.text()).not.toContain('Open ↗');
    const otherEvidence = org.get('[data-to]');
    expect(otherEvidence.text()).toBe('Other evidence');
    expect(otherEvidence.attributes('data-to')).toBe(
      JSON.stringify({ name: 'evidence:index', query: { subject: 'dc-1' } }),
    );
    expect(
      otherEvidence.element.parentElement,
      'the link sits on the title line',
    ).toBe(title.element.parentElement);

    const party = blocks[1]!;
    expect(party.text()).toContain('Network Team');
    expect(party.text()).not.toContain('Linked in SSPs');
    expect(
      party.find('a[target="_blank"]').exists(),
      'a title with only an unsafe link stays plain text',
    ).toBe(false);
  });

  it('shows "Unattributed" when the evidence has only legacy subjects', async () => {
    const wrapper = mountCard([legacySubject]);
    await flushPromises();

    expect(wrapper.text()).toContain('Unattributed');
    expect(wrapper.find('[data-testid="subject-block"]').exists()).toBe(false);
  });

  it('still shows what the evidence knows when the lookup returns nothing', async () => {
    lookupMock.mockResolvedValue([]);
    const wrapper = mountCard([templateSubject]);
    await flushPromises();

    const block = wrapper.get('[data-testid="subject-block"]');
    expect(block.get('a[target="_blank"]').text()).toBe(
      'GitHub Organization: acme',
    );
    expect(block.text()).not.toContain('Linked in SSPs');
  });

  it('shows two subjects, with the rest behind "Show N more"', async () => {
    const extra = (n: number): SubjectReference => ({
      subjectUuid: `extra-${n}`,
      type: 'component',
      title: `Extra ${n}`,
      props: [ccf('subject-source', 'template')],
    });
    const wrapper = mountCard([
      templateSubject,
      declaredSubject,
      legacySubject,
      extra(1),
      extra(2),
    ]);
    await flushPromises();

    const titles = () =>
      wrapper
        .findAll('[data-testid="subject-title"]')
        .map((title) => title.text());
    expect(titles()).toEqual(['GitHub Organization: acme', 'Network Team']);
    const toggle = wrapper.get('[data-testid="subjects-toggle"]');
    expect(toggle.text(), 'legacy subjects are not counted').toBe(
      'Show 2 more subjects',
    );

    await toggle.trigger('click');
    expect(titles()).toEqual([
      'GitHub Organization: acme',
      'Network Team',
      'Extra 1',
      'Extra 2',
    ]);
    expect(toggle.text()).toBe('Show fewer subjects');

    await toggle.trigger('click');
    expect(titles()).toHaveLength(2);
  });

  it('has no toggle with two subjects or fewer', async () => {
    const wrapper = mountCard([templateSubject, declaredSubject]);
    await flushPromises();

    expect(wrapper.findAll('[data-testid="subject-block"]')).toHaveLength(2);
    expect(wrapper.find('[data-testid="subjects-toggle"]').exists()).toBe(
      false,
    );
  });
});
