import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { ref } from 'vue';
import ControlLinkCreateView from '../ControlLinkCreateView.vue';
import ControlLinkListView from '../ControlLinkListView.vue';
import type { CatalogLinkSummary, ControlLink } from '@/types/control-links';

// --- Mocks ------------------------------------------------------------------

const apiCalls: Array<{ url: string; execute: ReturnType<typeof vi.fn> }> = [];
let listLinks: ControlLink[] = [];
let listCatalogLinks: CatalogLinkSummary[] = [];

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
  useDataApi: (url = '') => {
    const u = String(url);
    const execute = vi.fn(async () => ({ data: { value: { data: {} } } }));
    // Real refs so Vue templates auto-unwrap them (plain objects don't unwrap).
    let data = ref<unknown>(undefined);
    if (u === '/api/oscal/catalogs') {
      data = ref([
        { uuid: 'cat-1', metadata: { title: 'Standard Catalog' } },
        { uuid: 'cat-2', metadata: { title: 'Policy Catalog' } },
      ]);
    } else if (u === '/api/control-links') {
      data = ref(listLinks);
    } else if (u === '/api/control-links/catalog') {
      data = ref(listCatalogLinks);
    }
    apiCalls.push({ url: u, execute });
    return {
      execute,
      data,
      isLoading: ref(false),
      error: ref(null),
    };
  },
}));

vi.mock('@/composables/useControlOptions', () => ({
  useControlOptions: () => ({
    options: ref([
      { label: 'ac-1 · Access Control', value: 'ac-1' },
      { label: 'ac-2 · Account Management', value: 'ac-2' },
    ]),
    loading: ref(false),
  }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

const push = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

const deleteControlLink = vi.fn();
const deleteCatalogLink = vi.fn();
vi.mock('@/composables/controlLinks', () => ({
  useControlLinkDelete: () => ({ deleteControlLink, deleteCatalogLink }),
}));

// --- Stubs ------------------------------------------------------------------

const Select = {
  props: [
    'id',
    'modelValue',
    'options',
    'optionLabel',
    'optionValue',
    'placeholder',
    'filter',
    'filterFields',
    'loading',
    'invalid',
  ],
  emits: ['update:modelValue', 'change'],
  template: `<select :id="id" :value="modelValue" @change="onChange($event)">
    <option value="">--</option>
    <option v-for="(opt, i) in options" :key="i" :value="resolve(opt)">{{ i }}</option>
  </select>`,
  methods: {
    resolve(this: { optionValue?: string }, opt: Record<string, unknown>) {
      return this.optionValue ? opt[this.optionValue] : opt;
    },
    onChange(
      this: { $emit: (event: string, ...args: unknown[]) => void },
      e: Event,
    ) {
      const value = (e.target as HTMLSelectElement).value;
      this.$emit('update:modelValue', value);
      this.$emit('change');
    },
  },
};

// Renders one button per option; clicking it drives v-model + @change, letting a
// test switch the scope / view toggle via [data-value="…"].
const SelectButton = {
  props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'allowEmpty'],
  emits: ['update:modelValue', 'change'],
  template: `<div class="select-button"><button
      v-for="(opt, i) in options" :key="i" type="button"
      :data-value="resolve(opt)" @click="pick(resolve(opt))">{{ opt.label }}</button></div>`,
  methods: {
    resolve(this: { optionValue?: string }, opt: Record<string, unknown>) {
      return this.optionValue ? opt[this.optionValue] : opt;
    },
    pick(
      this: { $emit: (event: string, ...args: unknown[]) => void },
      value: unknown,
    ) {
      this.$emit('update:modelValue', value);
      this.$emit('change');
    },
  },
};

const stubs = {
  PageHeader: { template: '<div><slot /></div>' },
  PageSubHeader: { template: '<div><slot /></div>' },
  PageCard: { template: '<div><slot /></div>' },
  Label: {
    props: ['for', 'required'],
    template: '<label :for="$props.for"><slot /></label>',
  },
  Message: {
    props: ['severity'],
    template: '<div role="alert"><slot /></div>',
  },
  Select,
  SelectButton,
  PrimaryButton: {
    props: ['disabled', 'type'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled"><slot /></button>',
  },
  SecondaryButton: {
    props: ['disabled', 'type'],
    template: '<button type="button"><slot /></button>',
  },
  TertiaryButton: {
    props: ['disabled'],
    template: '<button :disabled="disabled"><slot /></button>',
  },
  RouterLinkButton: { template: '<a><slot /></a>' },
};

const mountOpts = {
  global: { stubs, directives: { tooltip: {} } },
};

function executeFor(url: string) {
  const call = apiCalls.find((apiCall) => apiCall.url === url);
  expect(call, `missing API call for ${url}`).toBeTruthy();
  return call?.execute;
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit.prevent');
}

// --- Tests ------------------------------------------------------------------

describe('ControlLinkCreateView', () => {
  beforeEach(() => {
    apiCalls.length = 0;
    push.mockClear();
    vi.clearAllMocks();
  });

  it('blocks submission and skips the POST when required fields are missing', async () => {
    const wrapper = mount(ControlLinkCreateView, mountOpts);

    await submit(wrapper);

    expect(wrapper.text()).toContain('Source catalog is required');
    expect(wrapper.text()).toContain('Relationship is required');
    expect(wrapper.text()).toContain('Target catalog is required');
    expect(executeFor('/api/control-links')).not.toHaveBeenCalled();
  });

  it('POSTs a source/target/relationshipType payload for a valid link', async () => {
    const wrapper = mount(ControlLinkCreateView, mountOpts);

    await wrapper.find('#source-catalog').setValue('cat-1');
    await wrapper.find('#source-control').setValue('ac-1');
    await wrapper.find('#relationship').setValue('implements');
    await wrapper.find('#target-catalog').setValue('cat-2');
    await wrapper.find('#target-control').setValue('ac-2');

    await submit(wrapper);

    expect(executeFor('/api/control-links')).toHaveBeenCalledWith({
      method: 'POST',
      data: {
        source: { catalogId: 'cat-1', controlId: 'ac-1' },
        target: { catalogId: 'cat-2', controlId: 'ac-2' },
        relationshipType: 'implements',
      },
    });
    expect(push).toHaveBeenCalledWith({ name: 'control-links-list' });
  });

  it('rejects a self-link between the same catalog and control', async () => {
    const wrapper = mount(ControlLinkCreateView, mountOpts);

    await wrapper.find('#source-catalog').setValue('cat-1');
    await wrapper.find('#source-control').setValue('ac-1');
    await wrapper.find('#relationship').setValue('implements');
    await wrapper.find('#target-catalog').setValue('cat-1');
    await wrapper.find('#target-control').setValue('ac-1');

    await submit(wrapper);

    expect(wrapper.text()).toContain(
      'Source and target cannot be the same control',
    );
    expect(executeFor('/api/control-links')).not.toHaveBeenCalled();
  });

  it('POSTs to /catalog with no source control in whole-catalog scope', async () => {
    const wrapper = mount(ControlLinkCreateView, mountOpts);

    // Switch scope to "Whole catalog".
    await wrapper.find('[data-value="catalog"]').trigger('click');
    // Source is a catalog only — no source-control select is rendered.
    expect(wrapper.find('#source-control').exists()).toBe(false);

    await wrapper.find('#source-catalog').setValue('cat-2');
    await wrapper.find('#relationship').setValue('implements');
    await wrapper.find('#target-catalog').setValue('cat-1');
    await wrapper.find('#target-control').setValue('ac-1');

    await submit(wrapper);

    expect(executeFor('/api/control-links/catalog')).toHaveBeenCalledWith({
      method: 'POST',
      data: {
        sourceCatalogId: 'cat-2',
        target: { catalogId: 'cat-1', controlId: 'ac-1' },
        relationshipType: 'implements',
      },
    });
    expect(push).toHaveBeenCalledWith({ name: 'control-links-list' });
  });
});

describe('ControlLinkListView', () => {
  beforeEach(() => {
    apiCalls.length = 0;
    vi.clearAllMocks();
    listCatalogLinks = [];
    listLinks = [
      {
        sourceCatalogId: 'cat-2',
        sourceControlId: 'pol-ac',
        targetCatalogId: 'cat-1',
        targetControlId: 'ac-1',
        relationshipType: 'implements',
      },
    ];
  });

  it('renders a row per link with resolved catalog titles and the relationship', () => {
    const wrapper = mount(ControlLinkListView, mountOpts);

    const text = wrapper.text();
    expect(text).toContain('pol-ac');
    expect(text).toContain('ac-1');
    // Catalog UUIDs resolve to their human titles.
    expect(text).toContain('Policy Catalog');
    expect(text).toContain('Standard Catalog');
    expect(text).toContain('implements');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
  });

  it('shows the empty state when there are no links', () => {
    listLinks = [];
    const wrapper = mount(ControlLinkListView, mountOpts);
    expect(wrapper.text()).toContain('No control links yet');
  });

  it('renders catalog-level links with control counts when toggled', async () => {
    listCatalogLinks = [
      {
        sourceCatalogId: 'cat-2',
        targetCatalogId: 'cat-1',
        targetControlId: 'ac-1',
        relationshipType: 'implements',
        controlCount: 7,
      },
    ];
    const wrapper = mount(ControlLinkListView, mountOpts);

    // Switch to the "Catalog links" view.
    await wrapper.find('[data-value="catalog"]').trigger('click');

    const text = wrapper.text();
    expect(text).toContain('Policy Catalog'); // source catalog title
    expect(text).toContain('ac-1'); // target control
    expect(text).toContain('7'); // control count
    expect(text).toContain('Re-sync');
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
  });
});
