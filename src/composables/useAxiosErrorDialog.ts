import { watch, type Ref } from 'vue';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import { errorDialog } from '@/services/error-dialog';

export interface AxiosErrorDialogOptions {
  /**
   * Summary prefix displayed before the formatted status message.
   */
  summary?: string;

  /**
   * Whether to automatically show the dialog when error occurs.
   * @default true
   */
  autoShow?: boolean;

  /**
   * Custom detail to override the formatted error detail.
   */
  detailOverride?: string;

  /**
   * Optional label for the close button.
   * @default 'Close'
   */
  closeLabel?: string;

  /**
   * Optional callback invoked after the dialog is dismissed.
   */
  onClose?: () => void;
}

/**
 * Composable to automatically display error dialogs for Axios errors.
 *
 * Watches a reactive Axios error ref and opens the shared error dialog when an error occurs.
 */
export function useAxiosErrorDialog(
  errorRef: Ref<AxiosError<ErrorResponse<ErrorBody>> | null | undefined>,
  options: AxiosErrorDialogOptions = {},
) {
  const {
    summary,
    autoShow = true,
    detailOverride,
    closeLabel,
    onClose,
  } = options;

  watch(errorRef, (error) => {
    if (error && autoShow) {
      showAxiosErrorDialog(error);
    }
  });

  function showAxiosErrorDialog(error: AxiosError<ErrorResponse<ErrorBody>>) {
    errorDialog.showAxiosError(error, {
      summary,
      detailOverride,
      closeLabel,
      onClose,
    });
  }

  return {
    showAxiosErrorDialog,
  };
}
