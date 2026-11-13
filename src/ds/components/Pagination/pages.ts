/**
 * Page numbers to show: the first and last page and the pages beside the current one; a gap of
 * one page shows that page, a longer gap an ellipsis (`'gap-…'` keys keep v-for keys unique).
 */
export function pageItems(
  page: number,
  pageCount: number,
): (number | `gap-${number}`)[] {
  const shown = [...new Set([1, page - 1, page, page + 1, pageCount])]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const items: (number | `gap-${number}`)[] = [];
  let previous = 0;
  for (const n of shown) {
    if (n - previous === 2) items.push(previous + 1);
    else if (n - previous > 2) items.push(`gap-${n}`);
    items.push(n);
    previous = n;
  }
  return items;
}
