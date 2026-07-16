import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ExportStatementDialog from '../ExportStatementDialog.vue';
import type { StatementExportState } from '@/composables/useStatementExport';

const { loadMock, saveMock, toastAddMock, permState, composableState } =
  vi.hoisted(() => ({
    loadMock: vi.fn(),
    saveMock: vi.fn(),
    toastAddMock: vi.fn(),
    permState: { can: true },
    composableState: {
      current: null as StatementExportState | null,
    },
  }));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('@/composables/useStatementExport', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/composables/useStatementExport')>();
  const { ref: vueRef } = await import('vue');
  const state = vueRef<StatementExportState | null>(null);
  const stepError = vueRef(null);
  return {
    ...actual,
    useStatementExport: () => ({
      state,
      loading: vueRef(false),
      saving: vueRef(false),
      stepError,
      load: loadMock.mockImplementation(() => {
        state.value = composableState.current;
        return Promise.resolve(true);
      }),
      save: saveMock,
    }),
  };
});

const stubs = {
  Dialog: {
    props: ['visible', 'header'],
    template:
      '<div v-if="visible" :data-header="header"><slot name="header" /><slot /></div>',
  },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  SelectButton: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<div data-testid="visibility-mode"><button v-for="o in options" :key="o.value" type="button" :data-value="o.value" @click="$emit(\'update:modelValue\', o.value)">{{ o.label }}</button></div>',
  },
  MultiSelect: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template: '<div data-testid="ssp-picker" />',
  },
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template: '<select />',
  },
  Label: { template: '<label><slot /></label>' },
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

function baseState(): StatementExportState {
  return {
    provided: [],
    responsibilities: [],
    allowedSspIds: [],
    sspOptions: [{ id: 'ssp-b', label: 'Downstream B' }],
    hasExport: false,
    alreadyPublished: false,
  };
}

async function mountDialog() {
  const wrapper = mount(ExportStatementDialog, {
    props: {
      sspId: 'ssp-1',
      sspTitle: 'Meridian Platform',
      controlId: 'ac-2',
      statementId: 'ac-2_smt.a',
      statementText: 'The org must manage accounts.',
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

function findButton(
  wrapper: Awaited<ReturnType<typeof mountDialog>>,
  text: string,
) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

describe('ExportStatementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    composableState.current = baseState();
    saveMock.mockResolvedValue(true);
  });

  // Responsibilities link to provided blocks by array index, so removing a block shifts
  // every index above it. Without a decrement the surviving link keeps its old index and
  // silently resolves to the NEXT capability — the wrong providedUuid is then PUT, with no
  // warning and no visible change in the form.
  it('keeps a responsibility on its own capability after an earlier one is removed', async () => {
    composableState.current = {
      ...baseState(),
      provided: [
        { uuid: 'p-a', description: 'Capability A' },
        { uuid: 'p-b', description: 'Capability B' },
        { uuid: 'p-c', description: 'Capability C' },
      ],
      // Linked to B.
      responsibilities: [
        { uuid: 'r-1', description: 'Rotate your own keys', providedIndex: 1 },
      ],
    };
    const wrapper = await mountDialog();

    // The provided section renders first, so its Remove buttons lead. Remove A.
    const removeButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Remove');
    await removeButtons[0].trigger('click');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const payload = saveMock.mock.calls[0][0];
    expect(
      payload.provided.map((p: { description: string }) => p.description),
    ).toEqual(['Capability B', 'Capability C']);
    // Still B — now index 0. A stale 1 would resolve to C.
    expect(payload.responsibilities[0].providedIndex).toBe(0);
  });

  it('re-points a responsibility whose own capability is removed to the first survivor', async () => {
    composableState.current = {
      ...baseState(),
      provided: [
        { uuid: 'p-a', description: 'Capability A' },
        { uuid: 'p-b', description: 'Capability B' },
      ],
      responsibilities: [
        { uuid: 'r-1', description: 'Rotate your own keys', providedIndex: 1 },
      ],
    };
    const wrapper = await mountDialog();

    const removeButtons = wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Remove');
    // Remove B — the very block this responsibility points at.
    await removeButtons[1].trigger('click');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const payload = saveMock.mock.calls[0][0];
    expect(payload.responsibilities[0].providedIndex).toBe(0);
  });

  it('loads on open and shows plain-language copy with no OSCAL jargon', async () => {
    const wrapper = await mountDialog();
    expect(loadMock).toHaveBeenCalled();

    const text = wrapper.text();
    expect(text).toContain('What this system provides');
    expect(text).toContain('What consumers remain responsible for');
    expect(text).toContain('Who can import this');
    // The whole point of the dialog: none of the OSCAL machinery leaks through.
    for (const jargon of [
      'by-component',
      'provided-uuid',
      'leveraged',
      'Party UUID',
      'offering',
    ]) {
      expect(text.toLowerCase()).not.toContain(jargon.toLowerCase());
    }
  });

  it('previews the full-scope block while the provided section is empty', async () => {
    const wrapper = await mountDialog();
    expect(wrapper.text()).toContain(
      'the full implementation of this statement will be shared',
    );
    expect(wrapper.text()).toContain(
      "Full scope of this statement's implementation is provided by Meridian Platform.",
    );

    await findButton(wrapper, 'Add a capability').trigger('click');
    expect(wrapper.text()).not.toContain(
      'the full implementation of this statement will be shared',
    );
  });

  it('shows the SSP picker only for restricted visibility, and validates it non-empty', async () => {
    const wrapper = await mountDialog();
    expect(wrapper.find('[data-testid="ssp-picker"]').exists()).toBe(false);

    await wrapper
      .find('[data-testid="visibility-mode"] [data-value="selected"]')
      .trigger('click');
    expect(wrapper.find('[data-testid="ssp-picker"]').exists()).toBe(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(saveMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Select at least one system');
  });

  it('rejects blank entries instead of silently dropping them', async () => {
    const wrapper = await mountDialog();
    await findButton(wrapper, 'Add a responsibility').trigger('click');

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(saveMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Some entries are empty');
  });

  it('saves the draft, toasts, closes and emits saved', async () => {
    const wrapper = await mountDialog();
    await findButton(wrapper, 'Add a responsibility').trigger('click');
    await wrapper.find('textarea').setValue('Consumers rotate their keys');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(saveMock).toHaveBeenCalledWith({
      provided: [],
      responsibilities: [
        {
          description: 'Consumers rotate their keys',
          providedIndex: 0,
        },
      ],
      allowedSspIds: [],
    });
    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
    expect(wrapper.emitted('saved')).toHaveLength(1);
    expect(wrapper.props('visible')).toBe(false);
  });

  it('hides the Share button without ssp:update', async () => {
    permState.can = false;
    const wrapper = await mountDialog();
    expect(wrapper.findAll('button').map((b) => b.text())).not.toContain(
      'Share',
    );
  });
});
