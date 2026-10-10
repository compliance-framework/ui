import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ByComponentSatisfiedEditor from '../ByComponentSatisfiedEditor.vue';
import type { ByComponentSatisfy } from '@/oscal';
import type { UpstreamResponsibility } from '@/types/ssp-export-offerings';

const { postMock, putMock, deleteMock, toastAddMock, permState } = vi.hoisted(
  () => ({
    postMock: vi.fn(),
    putMock: vi.fn(),
    deleteMock: vi.fn(),
    toastAddMock: vi.fn(),
    permState: { can: true },
  }),
);

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => permState.can,
    permissionTooltip: () => '',
  }),
}));

// The two editors now confirm before deleting (every other delete in this feature does);
// auto-confirm so the specs still exercise the DELETE itself.
vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: (onConfirm: () => void) => onConfirm(),
  }),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: (data: unknown) => data,
  useAuthenticatedInstance: () => ({
    post: postMock,
    put: putMock,
    delete: deleteMock,
  }),
}));

const stubs = {
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.responsibilityUuid" :value="o.responsibilityUuid">{{ o.description }}</option></select>',
  },
  Label: { template: '<label><slot /></label>' },
  Message: { template: '<div class="message"><slot /></div>' },
  PrimaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  SecondaryButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\', $event)"><slot /></button>',
  },
  ByComponentExportEntryFields: {
    props: ['description', 'responsibleRoles'],
    emits: ['update:description', 'update:responsibleRoles'],
    template:
      '<div><textarea :value="description" @input="$emit(\'update:description\', $event.target.value)" /></div>',
  },
};

const SATISFIED_URL =
  '/api/oscal/system-security-plans/ssp-1/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components/bc-1/satisfied';

// Only responsibilities carried by an export this statement inherits may be satisfied — the
// API 400s anything else, so these are the only options the picker may offer.
const responsibilityOptions: UpstreamResponsibility[] = [
  { responsibilityUuid: 'resp-1', description: 'Rotate your own keys' },
];

function mountEditor(
  modelValue: ByComponentSatisfy[] | undefined,
  options: UpstreamResponsibility[] = responsibilityOptions,
  labels?: UpstreamResponsibility[],
) {
  return mount(ByComponentSatisfiedEditor, {
    props: {
      sspId: 'ssp-1',
      reqId: 'req-1',
      stmtId: 'stmt-1',
      byComponentId: 'bc-1',
      modelValue,
      responsibilityOptions: options,
      responsibilityLabels: labels,
    },
    global: { stubs },
  });
}

function findButton(wrapper: ReturnType<typeof mountEditor>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

describe('ByComponentSatisfiedEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    postMock.mockResolvedValue({ data: { data: {} } });
    putMock.mockResolvedValue({ data: { data: {} } });
    deleteMock.mockResolvedValue({});
  });

  it('renders an empty state when nothing is satisfied', () => {
    const wrapper = mountEditor([]);
    expect(wrapper.text()).toContain('No satisfied entries yet.');
  });

  // Satisfied entries are subscription-owned too (subscribing creates them from
  // items[].satisfiedResponsibilityUuids), so this endpoint 409s on the same condition as
  // the inherited one. Without the branch, errors.body — a bare offering name — becomes the
  // entire text of a red toast.
  it('tells the user to unsubscribe when the entry is owned by a subscription (409)', async () => {
    deleteMock.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { errors: { body: 'the Meridian Platform Baseline offering' } },
      },
    });

    const wrapper = mountEditor([
      {
        uuid: 's-1',
        responsibilityUuid: 'resp-1',
        description: 'We rotate keys quarterly',
      } as ByComponentSatisfy,
    ]);
    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(toastAddMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        detail:
          'This satisfied entry came from your subscription to the Meridian Platform Baseline offering. Unsubscribe from the offering to remove it.',
      }),
    );
    // The row survives: only unsubscribing may remove it.
    expect(wrapper.text()).toContain('We rotate keys quarterly');
  });

  // An already-satisfied responsibility is by definition NOT outstanding, so it is absent
  // from the picker's options. Labelling from those options alone therefore always misses
  // for existing rows and falls through to the bare uuid.
  it('labels an existing entry from the full set, not the picker options', () => {
    const wrapper = mountEditor(
      [
        {
          uuid: 's-1',
          responsibilityUuid: 'resp-1',
          description: 'We rotate keys quarterly',
        } as ByComponentSatisfy,
      ],
      // Nothing outstanding: resp-1 is already satisfied.
      [],
      [{ responsibilityUuid: 'resp-1', description: 'Rotate your own keys' }],
    );

    expect(wrapper.text()).toContain('Rotate your own keys');
    expect(wrapper.text()).not.toContain('resp-1');
  });

  it('falls back to the uuid when the full set does not carry the responsibility', () => {
    const wrapper = mountEditor(
      [
        {
          uuid: 's-1',
          responsibilityUuid: 'resp-unknown',
          description: 'We rotate keys quarterly',
        } as ByComponentSatisfy,
      ],
      [],
      [],
    );

    expect(wrapper.text()).toContain('resp-unknown');
  });

  it('offers only the inherited responsibilities and creates against the statement URL', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          uuid: 's-1',
          responsibilityUuid: 'resp-1',
          description: 'We rotate keys quarterly',
          responsibleRoles: [],
        },
      },
    });

    const wrapper = mountEditor([]);
    await findButton(wrapper, 'Add Satisfied').trigger('click');

    const options = wrapper.findAll('option').map((o) => o.text());
    expect(options).toEqual(['Rotate your own keys']);

    await wrapper.find('select').setValue('resp-1');
    await wrapper.find('textarea').setValue('We rotate keys quarterly');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      SATISFIED_URL,
      expect.objectContaining({
        responsibilityUuid: 'resp-1',
        description: 'We rotate keys quarterly',
      }),
      expect.objectContaining({ transformRequest: expect.anything() }),
    );
  });

  it('refuses to create an entry without a responsibility', async () => {
    const wrapper = mountEditor([]);
    await findButton(wrapper, 'Add Satisfied').trigger('click');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).not.toHaveBeenCalled();
    expect(wrapper.find('.message').text()).toContain(
      'Select the responsibility this entry satisfies.',
    );
  });

  it('says so when nothing is available to satisfy', async () => {
    const wrapper = mountEditor([], []);
    await findButton(wrapper, 'Add Satisfied').trigger('click');
    expect(wrapper.text()).toContain(
      'No inherited responsibilities are available on this statement yet.',
    );
  });

  it('does not let responsibilityUuid be edited after create, and preserves it on PUT', async () => {
    putMock.mockResolvedValueOnce({
      data: {
        data: {
          uuid: 's-1',
          responsibilityUuid: 'resp-1',
          description: 'Updated',
          responsibleRoles: [],
        },
      },
    });

    const wrapper = mountEditor([
      { uuid: 's-1', responsibilityUuid: 'resp-1', description: 'Original' },
    ]);
    await findButton(wrapper, 'Edit').trigger('click');

    // No responsibility picker in edit mode: the anchor is fixed at create time.
    expect(wrapper.find('select').exists()).toBe(false);

    await wrapper.find('textarea').setValue('Updated');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(putMock).toHaveBeenCalledWith(
      `${SATISFIED_URL}/s-1`,
      expect.objectContaining({
        responsibilityUuid: 'resp-1',
        description: 'Updated',
      }),
      expect.anything(),
    );
  });

  it('deletes a satisfied entry', async () => {
    const wrapper = mountEditor([
      { uuid: 's-1', responsibilityUuid: 'resp-1', description: 'Original' },
    ]);
    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(`${SATISFIED_URL}/s-1`);
  });

  it('hides every mutation affordance without ssp:update', () => {
    permState.can = false;
    const wrapper = mountEditor([
      { uuid: 's-1', responsibilityUuid: 'resp-1', description: 'Original' },
    ]);
    const buttonTexts = wrapper.findAll('button').map((b) => b.text());
    expect(buttonTexts).not.toContain('Add Satisfied');
    expect(buttonTexts).not.toContain('Edit');
    expect(buttonTexts).not.toContain('Remove');
  });
});
