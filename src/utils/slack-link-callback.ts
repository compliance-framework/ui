export type SlackLinkCallbackStatus = 'success' | 'error';

export const CALLBACK_STATUS_QUERY_KEY = 'slack_link_status';
export const CALLBACK_CODE_QUERY_KEY = 'slack_link_code';

export const resolveSlackCallbackStatus = (
  value: unknown,
): SlackLinkCallbackStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'success' || normalized === 'error') {
    return normalized;
  }

  return null;
};

export const resolveSlackCallbackCode = (
  value: unknown,
): string | undefined => {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};
