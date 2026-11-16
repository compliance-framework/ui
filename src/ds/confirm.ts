import { shallowRef } from 'vue';

/**
 * Confirmations raised from scripts: `useConfirm().require({...})` asks the question and runs
 * `accept` or `reject` with the answer. ConfirmHost (mounted once in App) shows the open request
 * as a ConfirmDialog. Templates use ConfirmDialog directly instead.
 *
 * The option names follow the ones the app already used (PrimeVue's), so call sites read the same.
 */
export interface ConfirmButton {
  label?: string;
  severity?: string;
  outlined?: boolean;
}

export interface ConfirmRequest {
  header?: string;
  message?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptProps?: ConfirmButton;
  rejectProps?: ConfirmButton;
  accept?: () => unknown;
  reject?: () => unknown;
  /** Accepted for compatibility; ConfirmDialog sets its own icon from its tone. */
  icon?: string;
}

/** The request ConfirmHost is showing, if any. */
export const confirmRequest = shallowRef<ConfirmRequest>();

export function useConfirm() {
  return {
    require(request: ConfirmRequest): void {
      confirmRequest.value = request;
    },
    close(): void {
      confirmRequest.value = undefined;
    },
  };
}
