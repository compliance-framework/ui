import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref, shallowRef } from 'vue';
import type { SystemSecurityPlan } from '@/oscal';

const systemSecurityPlans = shallowRef<SystemSecurityPlan[]>([]);
const loading = ref(false);
const error = ref<unknown>(null);
const systemSecurityPlanJSON = shallowRef<SystemSecurityPlan | undefined>();

const mocks = vi.hoisted(() => ({
  executeDownload: vi.fn(),
  setSecurityPlan: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url?: string) => {
    if (url === '/api/oscal/system-security-plans') {
      return {
        data: systemSecurityPlans,
        isLoading: loading,
        error,
      };
    }

    if (url === undefined) {
      return {
        data: systemSecurityPlanJSON,
        execute: mocks.executeDownload,
      };
    }

    throw new Error(`Unexpected useDataApi call: ${url}`);
  },
}));

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: {
      securityPlan: undefined,
    },
    setSecurityPlan: mocks.setSecurityPlan,
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mocks.toastAdd,
  }),
}));

import SystemSecurityPlanListView from '../system-security-plans/SystemSecurityPlanListView.vue';

const routerLinkButtonStub = {
  name: 'RouterLinkButton',
  props: ['to'],
  template: '<a><slot /></a>',
};

function mountView() {
  return mount(SystemSecurityPlanListView, {
    global: {
      stubs: {
        PageHeader: { template: '<h1><slot /></h1>' },
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>',
        },
        RouterLinkButton: routerLinkButtonStub,
        PrimaryButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        Badge: {
          props: ['value'],
          template: '<span>{{ value }}</span>',
        },
      },
    },
  });
}

describe('SystemSecurityPlanListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    systemSecurityPlans.value = [];
    loading.value = false;
    error.value = null;
    systemSecurityPlanJSON.value = undefined;
  });

  it('links to the SSP create route from the list view', () => {
    const wrapper = mountView();
    const createButton = wrapper
      .findAllComponents({ name: 'RouterLinkButton' })
      .find((button) => button.text() === 'New System Security Plan');

    expect(createButton?.props('to')).toEqual({
      name: 'system-security-plans-create',
    });
  });
});
