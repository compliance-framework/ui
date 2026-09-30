import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { usePermissionsStore } from '@/stores/permissions';

/** A pinia whose permission store is hydrated with `permissions`. */
export function piniaWith(permissions: Record<string, string[]>): Pinia {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = usePermissionsStore();
  store.permissions = permissions;
  store.loaded = true;
  return pinia;
}

export function globalWith(
  pinia: Pinia,
  extraStubs: Record<string, unknown> = {},
) {
  return {
    plugins: [pinia, PrimeVue, ToastService, ConfirmationService],
    directives: {
      tooltip: { mounted: () => undefined, updated: () => undefined },
    },
    stubs: {
      // CodeMirror is stubbed everywhere except its own spec.
      CodeEditor: {
        name: 'CodeEditor',
        props: [
          'modelValue',
          'readonly',
          'language',
          'diagnostics',
          'ariaLabel',
        ],
        emits: ['update:modelValue'],
        template:
          '<textarea class="code-editor-stub" :data-language="language" :readonly="readonly" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      },
      CodeMergeView: {
        name: 'CodeMergeView',
        props: ['original', 'modified', 'language', 'mode'],
        template: '<div class="merge-stub">{{ original }}|{{ modified }}</div>',
      },
      ...extraStubs,
    },
  };
}

export const ADMIN = {
  admin: ['manage'],
  agent: ['read', 'configure', 'configure-policy'],
};
export const READER = { agent: ['read'] };
export const POLICY_AUTHOR = { agent: ['read', 'configure-policy'] };
