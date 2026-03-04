const INVALID_FIELD_SELECTORS = [
  '[aria-invalid="true"]',
  '.p-invalid',
  '[data-invalid="true"]',
].join(',');

export function focusFirstInvalidField(root: ParentNode = document): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const firstInvalid = root.querySelector<HTMLElement>(INVALID_FIELD_SELECTORS);
  if (!firstInvalid) {
    return false;
  }

  if (!firstInvalid.hasAttribute('tabindex')) {
    firstInvalid.setAttribute('tabindex', '-1');
  }

  firstInvalid.focus();
  return true;
}

export function toErrorSummaryItems(
  entries: Array<{ fieldId?: string; message?: string | null | undefined }>,
) {
  return entries
    .filter(
      (entry) => typeof entry.message === 'string' && entry.message.length > 0,
    )
    .map((entry) => ({
      fieldId: entry.fieldId,
      message: entry.message as string,
    }));
}
