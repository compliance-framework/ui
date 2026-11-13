import {
  computed,
  inject,
  useId,
  type ComputedRef,
  type InjectionKey,
} from 'vue';

/** What a FormField hands to the input inside it, so inputs wire themselves (F-20, F-11). */
export interface FieldContext {
  controlId: string;
  describedBy: ComputedRef<string | undefined>;
  invalid: ComputedRef<boolean>;
  required: ComputedRef<boolean>;
  readonly: ComputedRef<boolean>;
}

export const fieldKey: InjectionKey<FieldContext> = Symbol('FormField');

/** Joins the ids that are present into an aria-describedby value. */
export function joinIds(
  ...ids: (string | false | undefined)[]
): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

/**
 * Wiring for TextInput, Textarea and Select: taken from the surrounding FormField, or, when the
 * input stands alone (e.g. a toolbar search), `label()` becomes its accessible name.
 */
export function useFieldControl(label: () => string | undefined) {
  const field = inject(fieldKey, null);
  const ownId = useId();
  const invalid = computed(() => field?.invalid.value ?? false);
  const required = computed(() => field?.required.value ?? false);
  const readonly = computed(() => field?.readonly.value ?? false);
  const controlAttrs = computed(() => ({
    id: field?.controlId ?? ownId,
    'aria-label': field ? undefined : label(),
    'aria-describedby': field?.describedBy.value,
    'aria-invalid': invalid.value ? ('true' as const) : undefined,
    'aria-required': required.value ? ('true' as const) : undefined,
  }));
  return { controlAttrs, invalid, required, readonly };
}
