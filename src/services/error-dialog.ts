import { reactive, readonly } from 'vue';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';
import {
  formatAxiosError,
  formatError,
  type FormattedError,
} from '@/utils/error-formatting';

export interface ErrorDialogPayload {
  summary: string;
  detail: string;
  statusCode?: number;
  closeLabel?: string;
  onClose?: () => void;
}

interface ErrorDialogState
  extends Omit<ErrorDialogPayload, 'summary' | 'detail'> {
  visible: boolean;
  summary: string;
  detail: string;
}

const state = reactive<ErrorDialogState>({
  visible: false,
  summary: '',
  detail: '',
  statusCode: undefined,
  closeLabel: 'Close',
  onClose: undefined,
});

/**
 * Reset the dialog state after dismissal.
 */
function resetState() {
  state.summary = '';
  state.detail = '';
  state.statusCode = undefined;
  state.closeLabel = 'Close';
  state.onClose = undefined;
}

function buildSummary(
  formatted: FormattedError,
  overrideSummary?: string,
): string {
  if (!overrideSummary) {
    return formatted.summary || 'Error';
  }

  if (!formatted.summary || formatted.summary === overrideSummary) {
    return overrideSummary;
  }

  return `${overrideSummary}: ${formatted.summary}`;
}

function show(payload: ErrorDialogPayload) {
  state.summary = payload.summary || 'Error';
  state.detail = payload.detail;
  state.statusCode = payload.statusCode;
  state.closeLabel = payload.closeLabel ?? 'Close';
  state.onClose = payload.onClose;
  state.visible = true;
}

function hide(options: { invokeCallback?: boolean } = {}) {
  const { invokeCallback = true } = options;
  const callback = state.onClose;

  state.visible = false;
  resetState();

  if (invokeCallback && typeof callback === 'function') {
    callback();
  }
}

function showAxiosError(
  error: AxiosError<ErrorResponse<ErrorBody>>,
  options: {
    summary?: string;
    detailOverride?: string;
    closeLabel?: string;
    onClose?: () => void;
  } = {},
) {
  const formatted = formatAxiosError(error);
  show({
    summary: buildSummary(formatted, options.summary),
    detail: options.detailOverride ?? formatted.detail,
    statusCode: formatted.statusCode,
    closeLabel: options.closeLabel,
    onClose: options.onClose,
  });
}

function showError(
  error: unknown,
  options: {
    summary?: string;
    closeLabel?: string;
    onClose?: () => void;
    defaultDetail?: string;
  } = {},
) {
  const formatted = formatError(error, {
    defaultSummary: options.summary,
    defaultDetail: options.defaultDetail,
  });
  show({
    summary: buildSummary(formatted, options.summary),
    detail: formatted.detail,
    statusCode: formatted.statusCode,
    closeLabel: options.closeLabel,
    onClose: options.onClose,
  });
}

export const errorDialog = {
  show,
  hide,
  showAxiosError,
  showError,
};

export function useErrorDialogController() {
  return {
    state: readonly(state),
    hide,
  };
}
