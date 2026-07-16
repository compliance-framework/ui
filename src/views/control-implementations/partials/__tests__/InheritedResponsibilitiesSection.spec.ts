import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import InheritedResponsibilitiesSection from '../InheritedResponsibilitiesSection.vue';
import {
  LeveragedControlsKey,
  linkKey,
  type LeveragedControlsContext,
} from '@/composables/useLeveragedControls';
import type {
  LeveragedControl,
  ResponsibilityFilter,
} from '@/types/ssp-leverage';
import type { ImplementedRequirement, Statement } from '@/oscal';

const {
  getMock,
  postMock,
  putMock,
  deleteMock,
  toastAddMock,
  permState,
  refreshMock,
  decamelizeMarker,
} = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
  toastAddMock: vi.fn(),
  permState: { can: true },
  refreshMock: vi.fn(),
  decamelizeMarker: () => '',
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAddMock }),
}));

vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: (onConfirm: () => void) => onConfirm(),
  }),
}));

vi.mock('@/composables/axios', async () => {
  const { ref: vueRef } = await import('vue');
  return {
    decamelizeKeys: decamelizeMarker,
    useAuthenticatedInstance: () => ({
      get: getMock,
      post: postMock,
      put: putMock,
      delete: deleteMock,
    }),
    useDataApi: () => ({
      data: vueRef([
        { id: 'f-linkable', name: 'Linkable dashboard' },
        { id: 'f-attached', name: 'Already attached' },
        {
          id: 'f-component',
          name: 'Component-scoped',
          components: [{ uuid: 'c-1' }],
        },
      ]),
      isLoading: vueRef(false),
      error: vueRef(null),
      execute: getMock,
    }),
  };
});

const stubs = {
  Badge: {
    props: ['severity'],
    template: '<span :data-severity="severity"><slot /></span>',
  },
  Message: {
    props: ['severity'],
    template: '<div class="message"><slot /></div>',
  },
  Label: { template: '<label><slot /></label>' },
  Textarea: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Select: {
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template:
      '<select data-testid="dashboard-picker" @change="$emit(\'update:modelValue\', options[+($event.target.value)])"><option v-for="(o, i) in options" :key="o.id" :value="i">{{ o.name }}</option></select>',
  },
  SecondaryButton: {
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button type="button" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  DashboardEvidenceCounter: {
    props: ['dashboardId'],
    template: '<span data-testid="counter" :data-dashboard-id="dashboardId" />',
  },
  // The label-condition builder is covered by ControlStatementForms.spec; here we
  // only drive its v-model + submit to exercise the create → attach wiring.
  EvidenceDashboardForm: {
    template: `<div data-testid="create-form">
      <button data-testid="pick-baseline" @click="$emit('update:selectedBaselineEvidence', { title: 'Policy A', labels: [{ name: '_policy', value: 'iam' }] })"></button>
      <button data-testid="set-name" @click="$emit('update:name', 'IAM evidence')"></button>
      <button data-testid="submit-create" @click="$emit('submit')"></button>
      <button data-testid="cancel-create" @click="$emit('cancel')"></button>
    </div>`,
  },
  TooltipTitle: { props: ['text'], template: '<h4>{{ text }}</h4>' },
  PermissionGate: {
    template: '<span v-if="allowed"><slot /></span>',
    computed: {
      allowed: () => permState.can,
    },
  },
};

const SSP = 'ssp-down';
const SATISFIED_BASE = `/api/oscal/system-security-plans/${SSP}/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components/bc-1/satisfied`;

function makeLink(overrides: Partial<LeveragedControl> = {}): LeveragedControl {
  return {
    id: 'link-1',
    controlId: 'ac-2',
    statementId: 'ac-2_smt.a',
    inheritedFrom: {
      upstreamSspId: 'ssp-up',
      offeringId: 'off-1',
      offeringTitle: 'Platform Baseline',
      offeringVersion: 3,
    },
    providedUuid: 'p-1',
    byComponentId: 'bc-1',
    satisfaction: 'partial',
    status: 'active',
    outstandingResponsibilities: [
      { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
    ],
    responsibilityPosture: { 'r-1': 'unknown' },
    ...overrides,
  };
}

function makeStatement(withSatisfied = false): Statement {
  return {
    uuid: 'stmt-1',
    statementId: 'ac-2_smt.a',
    byComponents: [
      {
        uuid: 'bc-1',
        componentUuid: 'comp-1',
        description: 'x',
        satisfied: withSatisfied
          ? [
              {
                uuid: 's-1',
                responsibilityUuid: 'r-1',
                description: 'We rotate keys monthly',
              },
            ]
          : [],
      },
    ],
  } as Statement;
}

function makeContext(
  links: LeveragedControl[],
  filters: ResponsibilityFilter[] = [],
): LeveragedControlsContext {
  const map = new Map<string, LeveragedControl[]>();
  for (const link of links) {
    const key = linkKey(link.controlId, link.statementId);
    map.set(key, [...(map.get(key) ?? []), link]);
  }
  const filterMap = new Map<string, ResponsibilityFilter[]>();
  for (const filter of filters) {
    filterMap.set(filter.responsibilityUuid, [
      ...(filterMap.get(filter.responsibilityUuid) ?? []),
      filter,
    ]);
  }
  return {
    controls: ref(links),
    controlsLoading: ref(false),
    controlsError: ref(null),
    responsibilityFilters: ref(filters),
    responsibilityFiltersError: ref(null),
    linksByStatement: computed(() => map),
    filtersByResponsibility: computed(() => filterMap),
    refresh: refreshMock,
  } as unknown as LeveragedControlsContext;
}

function mountSection(
  links: LeveragedControl[],
  options: {
    statement?: Statement;
    filters?: ResponsibilityFilter[];
  } = {},
) {
  const implementation = {
    uuid: 'req-1',
    // The SSP's casing — the link's join is case-insensitive.
    controlId: 'AC-2',
  } as ImplementedRequirement;
  return mount(InheritedResponsibilitiesSection, {
    props: {
      statement: options.statement ?? makeStatement(),
      implementation,
      sspId: SSP,
    },
    global: {
      stubs,
      provide: {
        [LeveragedControlsKey as symbol]: makeContext(
          links,
          options.filters ?? [],
        ),
      },
    },
  });
}

function findButton(wrapper: ReturnType<typeof mountSection>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text);
  if (!button) throw new Error(`Button with text "${text}" not found`);
  return button;
}

describe('InheritedResponsibilitiesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permState.can = true;
    postMock.mockResolvedValue({ data: { data: {} } });
    putMock.mockResolvedValue({ data: { data: {} } });
    deleteMock.mockResolvedValue({});
    refreshMock.mockResolvedValue(undefined);
  });

  it('renders nothing when the statement has no leverage links', () => {
    const wrapper = mountSection([
      makeLink({ controlId: 'cm-5', statementId: 'cm-5_smt' }),
    ]);
    expect(wrapper.text()).toBe('');
  });

  it('creates a satisfied entry via the statement-level route with a client uuid and kebab wire', async () => {
    const wrapper = mountSection([makeLink()]);
    await wrapper.find('textarea').setValue('We rotate keys monthly');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledTimes(1);
    const [url, body, config] = postMock.mock.calls[0];
    expect(url).toBe(SATISFIED_BASE);
    expect(body).toEqual({
      uuid: expect.any(String),
      responsibilityUuid: 'r-1',
      description: 'We rotate keys monthly',
    });
    expect(
      (config as { transformRequest: unknown[] }).transformRequest,
    ).toContain(decamelizeMarker);
    expect(refreshMock).toHaveBeenCalled();
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('updates an existing satisfied entry with PUT (description only) and removes it with DELETE', async () => {
    const wrapper = mountSection([makeLink()], {
      statement: makeStatement(true),
    });

    await wrapper.find('textarea').setValue('We rotate keys weekly now');
    await findButton(wrapper, 'Save').trigger('click');
    await flushPromises();

    expect(putMock).toHaveBeenCalledWith(
      `${SATISFIED_BASE}/s-1`,
      { description: 'We rotate keys weekly now' },
      expect.objectContaining({ transformRequest: [decamelizeMarker] }),
    );

    await findButton(wrapper, 'Remove').trigger('click');
    await flushPromises();
    expect(deleteMock).toHaveBeenCalledWith(`${SATISFIED_BASE}/s-1`);
    expect(wrapper.emitted('changed')).toHaveLength(2);
  });

  it('is read-only with a hint when the anchor by-component cannot be resolved', () => {
    const wrapper = mountSection([makeLink({ byComponentId: undefined })]);
    expect(wrapper.text()).toContain('missing its component record');
    expect(wrapper.find('textarea').exists()).toBe(false);
  });

  it('attaches a dashboard with a camelCase body carrying the control id', async () => {
    const wrapper = mountSection([makeLink()]);
    await findButton(wrapper, 'Link dashboard').trigger('click');
    await flushPromises();

    // Pick the first linkable option (component-scoped ones are excluded).
    const picker = wrapper.find('[data-testid="dashboard-picker"]');
    await picker.setValue('0');
    await findButton(wrapper, 'Link').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      '/api/filters/f-linkable/responsibilities',
      { responsibilityUuid: 'r-1', sspId: SSP, controlId: 'AC-2' },
    );
    // Strictly two arguments: the camelCase filters API must NOT get a decamelize config.
    expect(postMock.mock.calls[0]).toHaveLength(2);
    expect(refreshMock).toHaveBeenCalled();
  });

  it('excludes already-attached and component-scoped dashboards from the picker', async () => {
    const wrapper = mountSection([makeLink()], {
      filters: [
        {
          responsibilityUuid: 'r-1',
          filterId: 'f-attached',
          filterName: 'Already attached',
          controlLinkCreated: true,
        },
      ],
    });
    await findButton(wrapper, 'Link dashboard').trigger('click');
    await flushPromises();

    const options = wrapper
      .find('[data-testid="dashboard-picker"]')
      .findAll('option')
      .map((o) => o.text());
    expect(options).toEqual(['Linkable dashboard']);
  });

  it('offers a Create dashboard option alongside Link dashboard', () => {
    const wrapper = mountSection([makeLink()]);
    const texts = wrapper.findAll('button').map((b) => b.text());
    expect(texts).toContain('Link dashboard');
    expect(texts).toContain('Create dashboard');
  });

  it('creates a dashboard scoped to the SSP and links it to the responsibility', async () => {
    getMock.mockResolvedValue({ data: { value: [] } });
    postMock.mockImplementation((url: string) => {
      if (url === '/api/filters') {
        return Promise.resolve({ data: { data: { id: 'new-f' } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    const wrapper = mountSection([makeLink()]);
    await findButton(wrapper, 'Create dashboard').trigger('click');
    await flushPromises();

    // Selecting a baseline auto-seeds a _policy condition → a valid filter.
    await wrapper.find('[data-testid="pick-baseline"]').trigger('click');
    await wrapper.find('[data-testid="set-name"]').trigger('click');
    await wrapper.find('[data-testid="submit-create"]').trigger('click');
    await flushPromises();

    // First the dashboard (camelCase body, SSP-scoped, no controls — the attach links it).
    const createCall = postMock.mock.calls.find((c) => c[0] === '/api/filters');
    expect(createCall).toBeTruthy();
    expect(createCall![1]).toEqual({
      name: 'IAM evidence',
      filter: expect.anything(),
      sspId: SSP,
    });
    expect(createCall![1]).not.toHaveProperty('controls');

    // Then attach it to the responsibility, carrying the control id.
    expect(postMock).toHaveBeenCalledWith(
      '/api/filters/new-f/responsibilities',
      { responsibilityUuid: 'r-1', sspId: SSP, controlId: 'AC-2' },
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it('detaches a dashboard with the sspId query param', async () => {
    const wrapper = mountSection([makeLink()], {
      filters: [
        {
          responsibilityUuid: 'r-1',
          filterId: 'f-attached',
          filterName: 'Already attached',
          controlLinkCreated: true,
        },
      ],
    });
    expect(
      wrapper.find('[data-testid="counter"]').attributes('data-dashboard-id'),
    ).toBe('f-attached');

    await findButton(wrapper, 'Unlink').trigger('click');
    await flushPromises();

    expect(deleteMock).toHaveBeenCalledWith(
      '/api/filters/f-attached/responsibilities/r-1',
      { params: { sspId: SSP } },
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it('offers Re-attest only for drifted links and posts to the attest route', async () => {
    const wrapper = mountSection([makeLink({ status: 'drifted' })]);
    expect(wrapper.text()).toContain(
      "The provider's implementation changed since you imported it.",
    );

    await findButton(wrapper, 'Re-attest').trigger('click');
    await flushPromises();

    expect(postMock).toHaveBeenCalledWith(
      `/api/oscal/system-security-plans/${SSP}/leveraged-controls/link-1/attest`,
    );
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('hides all mutation affordances without permission', () => {
    permState.can = false;
    const wrapper = mountSection([makeLink({ status: 'drifted' })], {
      filters: [
        {
          responsibilityUuid: 'r-1',
          filterId: 'f-attached',
          filterName: 'Already attached',
          controlLinkCreated: true,
        },
      ],
    });

    const texts = wrapper.findAll('button').map((b) => b.text());
    expect(texts).not.toContain('Save');
    expect(texts).not.toContain('Link dashboard');
    expect(texts).not.toContain('Create dashboard');
    expect(texts).not.toContain('Unlink');
    expect(texts).not.toContain('Re-attest');
    // The read side still renders.
    expect(wrapper.text()).toContain('Rotate your own keys');
  });
});
