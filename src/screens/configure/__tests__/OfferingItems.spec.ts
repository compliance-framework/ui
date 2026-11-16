import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import type { ControlImplementation, SystemImplementation } from '@/oscal';
import type { SSPExportOffering } from '@/types/ssp-export-offerings';
import OfferingItems from '../OfferingItems.vue';

const state = vi.hoisted(() => ({
  can: true,
  post: vi.fn(),
  del: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: state.post, delete: state.del }),
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => state.can }),
}));
vi.mock('@/ds/toasts', () => ({
  useToast: () => ({ add: state.toast }),
}));

const systemImplementation: SystemImplementation = {
  users: [],
  components: [
    {
      uuid: 'comp-1',
      type: 'software',
      title: 'API',
      description: '',
      status: { state: 'operational' },
    },
    {
      uuid: 'comp-2',
      type: 'software',
      title: 'Legacy Box',
      description: '',
      status: { state: 'operational' },
    },
  ],
};

// One statement-level export (offerable) and one requirement-level export (listed, not offerable).
const controlImplementation: ControlImplementation = {
  description: '',
  implementedRequirements: [
    {
      uuid: 'req-1',
      controlId: 'ac-1',
      byComponents: [
        {
          uuid: 'bc-legacy',
          componentUuid: 'comp-2',
          description: '',
          export: {
            uuid: 'exp-legacy',
            description: '',
            provided: [{ uuid: 'p-legacy', description: 'Legacy capability' }],
          },
        },
      ],
      statements: [
        {
          uuid: 'stmt-1',
          statementId: 'ac-1_smt.a',
          byComponents: [
            {
              uuid: 'bc-1',
              componentUuid: 'comp-1',
              description: '',
              export: {
                uuid: 'exp-1',
                description: '',
                provided: [
                  { uuid: 'p-1', description: 'We provide access control' },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

const STATEMENT_KEY = 'ac-1::ac-1_smt.a::comp-1::p-1';
const LEGACY_KEY = 'ac-1::::comp-2::p-legacy';
const item = {
  id: 'item-1',
  offeringId: 'offering-1',
  controlId: 'ac-1',
  statementId: 'ac-1_smt.a',
  componentUuid: 'comp-1',
  providedUuid: 'p-1',
};

const offering = (
  overrides: Partial<SSPExportOffering> = {},
): SSPExportOffering => ({
  id: 'offering-1',
  sspId: 'ssp-1',
  title: 'My Offering',
  description: '',
  version: 0,
  status: 'draft',
  contentHash: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  items: [],
  ...overrides,
});

function mountItems(o = offering()) {
  const emitted: unknown[][] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(OfferingItems, {
            sspId: 'ssp-1',
            offering: o,
            controlImplementation,
            systemImplementation,
            onUpdated: (items: unknown[]) => emitted.push(items),
          }),
        ),
    }),
    { attachTo: document.body },
  );
  return { wrapper, emitted: () => emitted };
}

const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().startsWith(text))!;

describe('OfferingItems', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.can = true;
    state.post.mockResolvedValue({ data: { data: item } });
    state.del.mockResolvedValue({});
  });

  it('says so when the offering has no items', () => {
    const { wrapper } = mountItems();
    expect(wrapper.text()).toContain('No items yet.');
    wrapper.unmount();
  });

  it('adds the chosen capability, sending its statement', async () => {
    const { wrapper, emitted } = mountItems();
    await wrapper.find('select').setValue(STATEMENT_KEY);
    await button(wrapper, 'Add item').trigger('click');
    await flushPromises();
    expect(state.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/items',
      {
        controlId: 'ac-1',
        statementId: 'ac-1_smt.a',
        componentUuid: 'comp-1',
        providedUuid: 'p-1',
      },
    );
    expect(emitted().at(-1)).toEqual([item]);
    expect(wrapper.text()).toContain('ac-1 · Statement ac-1_smt.a');
    expect(wrapper.text()).toContain('API: We provide access control');
    wrapper.unmount();
  });

  it('lists requirement-level capabilities as options that cannot be chosen', () => {
    const { wrapper } = mountItems();
    const options = wrapper.findAll('option');
    const statement = options.find(
      (o) => o.attributes('value') === STATEMENT_KEY,
    );
    const legacy = options.find((o) => o.attributes('value') === LEGACY_KEY);
    expect(statement?.attributes('disabled')).toBeUndefined();
    expect(legacy?.attributes('disabled')).toBeDefined();
    expect(legacy?.text()).toContain('move it to a statement to offer it');
    wrapper.unmount();
  });

  it('explains a requirement-level choice instead of doing nothing', async () => {
    const { wrapper } = mountItems();
    const select = wrapper.find('select').element as HTMLSelectElement;
    // Disabled in a browser, but the handler must still refuse it if it gets through.
    select.querySelector<HTMLOptionElement>(
      `option[value="${LEGACY_KEY}"]`,
    )!.disabled = false;
    await wrapper.find('select').setValue(LEGACY_KEY);
    await button(wrapper, 'Add item').trigger('click');
    await flushPromises();
    expect(state.post).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(
      'authored on the requirement, not a statement',
    );
    wrapper.unmount();
  });

  it("shows the API's refusal by the picker", async () => {
    state.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { errors: { body: 'statement_id is required' } },
      },
    });
    const { wrapper } = mountItems();
    await wrapper.find('select').setValue(STATEMENT_KEY);
    await button(wrapper, 'Add item').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('statement_id is required');
    wrapper.unmount();
  });

  it('removes an item', async () => {
    const { wrapper, emitted } = mountItems(offering({ items: [item] }));
    await wrapper
      .find('button[aria-label="Remove ac-1 · Statement ac-1_smt.a"]')
      .trigger('click');
    await flushPromises();
    expect(state.del).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/offering-1/items/item-1',
    );
    expect(emitted().at(-1)).toEqual([]);
    wrapper.unmount();
  });

  it('shows an error toast when removing fails', async () => {
    state.del.mockRejectedValueOnce(new Error('network down'));
    const { wrapper } = mountItems(offering({ items: [item] }));
    await wrapper
      .find('button[aria-label="Remove ac-1 · Statement ac-1_smt.a"]')
      .trigger('click');
    await flushPromises();
    expect(state.toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
    wrapper.unmount();
  });

  it('disables adding and removing without permission', async () => {
    state.can = false;
    const { wrapper } = mountItems(offering({ items: [item] }));
    expect(
      wrapper.find('button[aria-label^="Remove"]').attributes('aria-disabled'),
    ).toBe('true');
    expect(button(wrapper, 'Add item').attributes('aria-disabled')).toBe(
      'true',
    );
    wrapper.unmount();
  });

  it('explains that a revoked offering cannot change', () => {
    const { wrapper } = mountItems(
      offering({ status: 'revoked', items: [item] }),
    );
    expect(wrapper.text()).toContain('has been revoked');
    expect(
      wrapper.find('button[aria-label^="Remove"]').attributes('aria-disabled'),
    ).toBe('true');
    wrapper.unmount();
  });
});
