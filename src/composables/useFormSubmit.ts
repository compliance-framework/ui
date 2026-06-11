import type { AxiosError } from 'axios';
import { reactive, ref } from 'vue';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';

export interface RequiredField {
  key: string;
  message: string;
  isMissing: () => boolean;
}

export function useFormSubmit(
  requiredFields: RequiredField[],
  fallbackMessage: string,
) {
  const errors = reactive<Record<string, string>>({});
  const errorMessage = ref('');
  const isSubmitting = ref(false);

  function resetFormState(): void {
    Object.keys(errors).forEach((key) => delete errors[key]);
    errorMessage.value = '';
  }

  function validate(): boolean {
    resetFormState();

    requiredFields.forEach((field) => {
      if (field.isMissing()) {
        errors[field.key] = field.message;
      }
    });

    return Object.keys(errors).length === 0;
  }

  function getErrorMessage(error: unknown): string {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    return (
      errorResponse.response?.data?.errors?.body ||
      (error instanceof Error ? error.message : fallbackMessage)
    );
  }

  return {
    errors,
    errorMessage,
    isSubmitting,
    resetFormState,
    validate,
    getErrorMessage,
  };
}
