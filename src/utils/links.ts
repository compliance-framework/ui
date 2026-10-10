export function normalizeLinkHref(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isInternalLink(value?: string) {
  return normalizeLinkHref(value).startsWith('#');
}

// The href, if it's safe to render as a clickable external link (http(s) or mailto);
// otherwise ''.
export function getSafeExternalHref(value?: string) {
  const href = normalizeLinkHref(value);

  if (/^(https?:|mailto:)/i.test(href)) {
    return href;
  }

  return '';
}
