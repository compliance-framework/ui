import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import ExportOfferingForm from '../ExportOfferingForm.vue';
import SystemExportOfferingsSection from '../SystemExportOfferingsSection.vue';

const api = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
const state = vi.hoisted(() => ({ list: [] as unknown[], can: true }));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => state.can }),
}));
const offering = (id: string, status: string, title: string) => ({
  id,
  sspId: 'ssp-1',
  title,
  description: '',
  version: 2,
  status,
  contentHash: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  publishedAt: status === 'draft' ? undefined : '2026-02-01T00:00:00Z',
  items: [{ id: 'i-1' }],
});
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(url.endsWith('/export-offerings') ? state.list : {}),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountSection() {
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SystemExportOfferingsSection, { sspId: 'ssp-1' }),
        ),
    }),
    {
      attachTo: document.body,
      // The classic forms and editors are islands with their own specs.
      global: {
        stubs: {
          ExportOfferingForm: true,
          ExportOfferingItemsDialog: true,
          ExportOfferingAllowlistDialog: true,
        },
      },
    },
  );
  await flushPromises();
  return wrapper;
}

const menuFor = (wrapper: ReturnType<typeof mount>, title: string) =>
  (wrapper
    .findAllComponents(Menu)
    .find((m) => m.props('label') === `Actions for ${title}`)!
    .props('items') as MenuAction[]) ?? [];
const labels = (items: MenuAction[]) => items.map((i) => i.label);

describe('SystemExportOfferingsSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.can = true;
    state.list = [
      offering('o-1', 'draft', 'Draft baseline'),
      offering('o-2', 'published', 'Live baseline'),
    ];
    api.post.mockReset().mockResolvedValue({
      data: { data: offering('o-1', 'published', 'Draft baseline') },
    });
    api.patch.mockReset().mockResolvedValue({
      data: { data: offering('o-2', 'revoked', 'Live baseline') },
    });
  });

  it('lists offerings with status, version, items and published date', async () => {
    const wrapper = await mountSection();
    const text = wrapper.text();
    expect(text).toContain('Draft baseline');
    expect(text).toContain('draft');
    expect(text).toContain('v2');
    expect(text).toContain('1 item');
    expect(text).toContain('Not yet');
    expect(text).toContain('1 Feb 2026');
    wrapper.unmount();
  });

  it('offers Publish for drafts, and Republish, Deprecate and Revoke once published', async () => {
    const wrapper = await mountSection();
    expect(labels(menuFor(wrapper, 'Draft baseline'))).toEqual([
      'Edit offering',
      'Manage items',
      'Allowed downstream systems',
      'Publish',
    ]);
    expect(labels(menuFor(wrapper, 'Live baseline'))).toEqual([
      'Edit offering',
      'Manage items',
      'Allowed downstream systems',
      'Republish',
      'Deprecate',
      'Revoke',
    ]);
    wrapper.unmount();
  });

  it('publishes a draft', async () => {
    const wrapper = await mountSection();
    menuFor(wrapper, 'Draft baseline').find((i) => i.label === 'Publish')!
      .onSelect!();
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/o-1/publish',
    );
    expect(labels(menuFor(wrapper, 'Draft baseline'))).toContain('Republish');
    wrapper.unmount();
  });

  it('revokes a published offering after confirmation', async () => {
    const wrapper = await mountSection();
    menuFor(wrapper, 'Live baseline').find((i) => i.label === 'Revoke')!
      .onSelect!();
    await flushPromises();
    const confirm = wrapper.findComponent(ConfirmDialog);
    expect(confirm.props('title')).toBe('Revoke Live baseline?');
    confirm.vm.$emit('confirm');
    await flushPromises();
    expect(api.patch).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/export-offerings/o-2/status',
      { status: 'revoked' },
    );
    expect(wrapper.text()).toContain('revoked');
    wrapper.unmount();
  });

  it('shows an empty state when the system offers nothing', async () => {
    state.list = [];
    const wrapper = await mountSection();
    expect(wrapper.text()).toContain('No export offerings yet');
    wrapper.unmount();
  });

  it('adds a created offering and reflects an edited one', async () => {
    const wrapper = await mountSection();
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('New offering'))!
      .click();
    await flushPromises();
    wrapper
      .findComponent(ExportOfferingForm)
      .vm.$emit('created', offering('o-3', 'draft', 'New baseline'));
    await flushPromises();
    expect(wrapper.text()).toContain('New baseline');

    menuFor(wrapper, 'Live baseline').find((i) => i.label === 'Edit offering')!
      .onSelect!();
    await flushPromises();
    wrapper
      .findComponent(ExportOfferingForm)
      .vm.$emit('saved', offering('o-2', 'published', 'Renamed baseline'));
    await flushPromises();
    expect(wrapper.text()).toContain('Renamed baseline');
    expect(wrapper.text()).not.toContain('Live baseline');
    wrapper.unmount();
  });

  it('offers neither Publish nor status changes for a revoked offering', async () => {
    state.list = [offering('o-4', 'revoked', 'Old baseline')];
    const wrapper = await mountSection();
    expect(labels(menuFor(wrapper, 'Old baseline'))).toEqual([
      'Edit offering',
      'Manage items',
      'Allowed downstream systems',
    ]);
    wrapper.unmount();
  });

  it('disables changes, saying why, without permission', async () => {
    state.can = false;
    const wrapper = await mountSection();
    const items = menuFor(wrapper, 'Live baseline');
    for (const label of ['Edit offering', 'Republish', 'Deprecate', 'Revoke'])
      expect(items.find((i) => i.label === label)!.disabledReason).toBeTruthy();
    const create = wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('New offering'))!;
    expect(create.attributes('aria-disabled')).toBe('true');
    wrapper.unmount();
  });
});
