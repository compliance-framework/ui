import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ImportFromSspDialog from '../ImportFromSspDialog.vue';
import type { CatalogOffering } from '@/types/ssp-export-offerings';

const { getMock, postMock, permState } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  permState: { can: true },
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    get: getMock,
    post: postMock,
  }),
}));

// importSelected() enforces the permission itself (the gate around the button governs only
// what renders), so the composable is mocked off the same permState as the gate stub.
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => permState.can,
    permissionTooltip: () => '',
  }),
}));

const DOWNSTREAM = 'ssp-down';

function makeCatalog(): CatalogOffering[] {
  return [
    // The downstream's own offering: must never be shown back to it.
    {
      id: 'off-self',
      sspId: DOWNSTREAM,
      title: 'Own Offering',
      description: '',
      version: 1,
      status: 'published',
      contentHash: '',
      createdAt: '',
      updatedAt: '',
      items: [
        {
          id: 'item-self',
          offeringId: 'off-self',
          controlId: 'zz-9',
          statementId: 'zz-9_smt',
          componentUuid: 'c',
          providedUuid: 'p-self',
          responsibilities: [],
        },
      ],
    },
    // An upstream with an item for a DIFFERENT control (sorts after the ac-2 match).
    {
      id: 'off-other',
      sspId: 'ssp-other',
      title: 'Other Baseline',
      description: '',
      version: 3,
      status: 'published',
      contentHash: '',
      createdAt: '',
      updatedAt: '',
      items: [
        {
          id: 'item-other',
          offeringId: 'off-other',
          controlId: 'cm-5',
          statementId: 'cm-5_smt',
          componentUuid: 'c',
          providedUuid: 'p-other',
          responsibilities: [],
        },
      ],
    },
    // The upstream matching the open control, plus an already-imported item.
    {
      id: 'off-1',
      sspId: 'ssp-up',
      title: 'Platform Baseline',
      description: '',
      version: 2,
      status: 'published',
      contentHash: '',
      createdAt: '',
      updatedAt: '',
      items: [
        {
          id: 'item-1',
          offeringId: 'off-1',
          controlId: 'AC-2',
          statementId: 'AC-2_smt.a',
          componentUuid: 'c',
          providedUuid: 'p-1',
          responsibilities: [
            { responsibilityUuid: 'r-1', description: 'Review the log' },
          ],
        },
        {
          id: 'item-2',
          offeringId: 'off-1',
          controlId: 'AC-2',
          statementId: 'AC-2_smt.b',
          componentUuid: 'c',
          providedUuid: 'p-already',
          responsibilities: [],
        },
      ],
    },
  ];
}

function installGetMock(overrides?: {
  failSsps?: boolean;
  nullResponsibilities?: boolean;
}) {
  getMock.mockImplementation((url: string) => {
    if (url === '/api/oscal/ssp-export-offerings') {
      const catalog = makeCatalog();
      if (overrides?.nullResponsibilities) {
        // A Go nil slice marshals to `null`, not `[]`. Every other fixture in this file
        // uses `[]`, which is why the unguarded `.length` deref shipped twice.
        for (const offering of catalog) {
          for (const item of offering.items ?? []) {
            item.responsibilities = null as unknown as undefined;
          }
        }
      }
      return Promise.resolve({ data: { data: catalog } });
    }
    if (url === '/api/oscal/system-security-plans') {
      if (overrides?.failSsps) return Promise.reject(new Error('boom'));
      return Promise.resolve({
        data: {
          data: [
            { uuid: 'ssp-up', metadata: { title: 'Meridian Platform' } },
            { uuid: 'ssp-other', metadata: { title: 'Other System' } },
          ],
        },
      });
    }
    if (url.includes('/shared-responsibility')) {
      return Promise.resolve({
        data: {
          data: {
            provides: [],
            inherits: [{ providedUuid: 'p-already' }],
            satisfies: [],
            legacy: [],
          },
        },
      });
    }
    if (url.includes('/by-control/')) {
      return Promise.resolve({
        data: {
          data: [
            {
              itemId: 'item-1',
              provided: { uuid: 'p-1', description: 'Org-wide MFA enforced' },
            },
          ],
        },
      });
    }
    return Promise.reject(new Error(`unrouted GET ${url}`));
  });
}

const stubs = {
  Dialog: {
    props: ['visible', 'header'],
    template: '<div v-if="visible" :data-header="header"><slot /></div>',
  },
  InputText: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Badge: { template: '<span><slot /></span>' },
  Message: { template: '<div class="message"><slot /></div>' },
  PrimaryButton: {
    props: ['disabled', 'type'],
    template:
      '<button :type="type ?? \'button\'" :disabled="disabled"><slot /></button>',
  },
  SecondaryButton: {
    emits: ['click'],
    template:
      '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  PermissionGate: {
    template: '<span v-if="allowed"><slot /></span>',
    computed: {
      allowed: () => permState.can,
    },
  },
};

async function mountDialog(currentControlId?: string) {
  const wrapper = mount(ImportFromSspDialog, {
    props: {
      sspId: DOWNSTREAM,
      currentControlId,
      visible: true,
      'onUpdate:visible': async (value: boolean) => {
        await wrapper.setProps({ visible: value });
      },
    },
    global: { stubs },
  });
  await flushPromises();
  return wrapper;
}

describe('ImportFromSspDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    installGetMock();
    postMock.mockResolvedValue({ data: { data: [], meta: undefined } });
  });

  it('groups offerings by upstream system title and never shows the downstream its own', async () => {
    const wrapper = await mountDialog();
    const text = wrapper.text();

    expect(text).toContain('Meridian Platform');
    expect(text).toContain('Other System');
    expect(text).not.toContain('Own Offering');
  });

  it('renders a preselected item whose responsibilities came back as null', async () => {
    installGetMock({ nullResponsibilities: true });
    // Preselection is what makes this reachable: `selectedItemIds.has(item.id)` is true on
    // the FIRST render, so `&&` no longer short-circuits the `.length` deref away.
    const wrapper = await mountDialog('ac-2');

    expect(wrapper.text()).toContain('Meridian Platform');
    expect(wrapper.text()).toContain('AC-2 · Statement AC-2_smt.a');
    // The row is there; it just has no responsibilities to tick.
    expect(wrapper.text()).not.toContain('You take these on');
  });

  // The search box is this form's only text input, so in a real browser Enter implicitly
  // submits it and runs importSelected() — a path that never touches the Import button or
  // the PermissionGate around it. jsdom does not implement implicit submission, so asserting
  // "no POST fired" here would pass with or without the fix; what IS meaningful is that the
  // keydown is default-prevented, since that is precisely what suppresses the submit.
  it('default-prevents Enter in the search box so it cannot submit the form', async () => {
    const wrapper = await mountDialog('ac-2');

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    wrapper.find('input').element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  // A gate that only hides a button is not an authorization check while another path can
  // reach the handler. Without the check in importSelected() the POST fires and 403s, and
  // the 403 copy blames the provider's allow-list for what is really an RBAC denial.
  it('does not subscribe when the subject lacks permission, even if the handler is reached', async () => {
    permState.can = false;
    const wrapper = await mountDialog('ac-2');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(postMock).not.toHaveBeenCalled();
  });

  it('falls back to an id-derived group name when the SSP list cannot be read', async () => {
    installGetMock({ failSsps: true });
    const wrapper = await mountDialog();

    expect(wrapper.text()).toContain('System ssp-up');
  });

  it('sorts and preselects the open control, enriches it, and disables already-imported items', async () => {
    const wrapper = await mountDialog('ac-2');

    expect(wrapper.text()).toContain('the control you have open');
    // Enrichment from the by-control endpoint, fetched with the downstream filter.
    expect(getMock).toHaveBeenCalledWith(
      '/api/oscal/ssp-export-offerings/by-control/ac-2?downstreamSspId=ssp-down',
    );
    expect(wrapper.text()).toContain('Org-wide MFA enforced');

    // The matching group renders before the non-matching one.
    const text = wrapper.text();
    expect(text.indexOf('Meridian Platform')).toBeLessThan(
      text.indexOf('Other System'),
    );

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    // item-1 preselected (match), item-2 disabled (already imported), item-other unchecked.
    const byLabel = new Map(
      checkboxes.map((c) => {
        const label = c.element.closest('label')?.textContent?.trim() ?? '';
        return [label, c] as const;
      }),
    );
    const item1 = [...byLabel.entries()].find(([label]) =>
      label.includes('AC-2 · Statement AC-2_smt.a'),
    )?.[1];
    const item2 = [...byLabel.entries()].find(([label]) =>
      label.includes('AC-2 · Statement AC-2_smt.b'),
    )?.[1];
    expect((item1!.element as HTMLInputElement).checked).toBe(true);
    expect((item2!.element as HTMLInputElement).disabled).toBe(true);
    expect(wrapper.text()).toContain('Already imported');
  });

  it('imports across offerings with one subscribe per offering and merges the metas', async () => {
    postMock.mockImplementation((url: string) => {
      if (url.includes('off-1')) {
        return Promise.resolve({
          data: {
            data: [{ id: 'link-1' }],
            meta: {
              created: {
                implementedRequirements: [
                  { uuid: 'req-9', controlId: 'ac-2', created: true },
                ],
                statements: [],
                byComponents: [],
              },
            },
          },
        });
      }
      return Promise.resolve({
        data: {
          data: [{ id: 'link-2' }],
          meta: {
            created: {
              implementedRequirements: [
                { uuid: 'req-8', controlId: 'cm-5', created: true },
              ],
              statements: [],
              byComponents: [],
            },
          },
        },
      });
    });

    const wrapper = await mountDialog('ac-2');
    // Also select the other upstream's cm-5 item.
    const otherCheckbox = wrapper
      .findAll('input[type="checkbox"]')
      .find((c) => c.element.closest('label')?.textContent?.includes('cm-5'));
    await otherCheckbox!.setValue(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // One subscribe per offering, each with no leveragedAuthorization — sharing is
    // decoupled from an Authority to Operate.
    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/ssp-export-offerings/off-1/subscribe',
      {
        downstreamSspId: DOWNSTREAM,
        items: [{ itemId: 'item-1', satisfiedResponsibilityUuids: [] }],
      },
    );
    expect(postMock).toHaveBeenCalledWith(
      '/api/oscal/ssp-export-offerings/off-other/subscribe',
      {
        downstreamSspId: DOWNSTREAM,
        items: [{ itemId: 'item-other', satisfiedResponsibilityUuids: [] }],
      },
    );

    const emitted = wrapper.emitted('imported');
    expect(emitted).toHaveLength(1);
    const payload = emitted![0][0] as {
      links: unknown[];
      meta: {
        created: { implementedRequirements: Array<{ uuid: string }> };
      };
    };
    expect(payload.links).toHaveLength(2);
    expect(
      payload.meta.created.implementedRequirements.map((r) => r.uuid).sort(),
    ).toEqual(['req-8', 'req-9']);
    // Everything succeeded — the dialog closes itself.
    expect(wrapper.props('visible')).toBe(false);
  });

  it('keeps the dialog open with a per-offering error row on partial failure', async () => {
    postMock.mockImplementation((url: string) => {
      if (url.includes('off-1')) {
        return Promise.reject({ response: { status: 409 } });
      }
      return Promise.resolve({
        data: { data: [{ id: 'link-2' }], meta: undefined },
      });
    });

    const wrapper = await mountDialog('ac-2');
    const otherCheckbox = wrapper
      .findAll('input[type="checkbox"]')
      .find((c) => c.element.closest('label')?.textContent?.includes('cm-5'));
    await otherCheckbox!.setValue(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Already imported into this system.');
    // The successful import is still reported upward; the dialog stays open.
    expect(wrapper.emitted('imported')).toHaveLength(1);
    expect(wrapper.props('visible')).toBe(true);
  });

  it('filters groups, offerings and items by the search term', async () => {
    const wrapper = await mountDialog();
    await wrapper.find('input:not([type="checkbox"])').setValue('cm-5');

    expect(wrapper.text()).toContain('Other Baseline');
    expect(wrapper.text()).not.toContain('Platform Baseline');
  });
});
