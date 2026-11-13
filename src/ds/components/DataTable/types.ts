/** A DataTable column. `key` names the row field and the `cell-<key>` slot. */
export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  /** Direction when selecting this column from another column or an unsorted table. */
  initialDirection?: DataTableSort['direction'];
  align?: 'start' | 'end';
  nowrap?: boolean;
  /** Keeps a wordy column readable when the table scrolls on narrow screens. */
  minWidth?: 'sm' | 'md';
}

/** The current sort, bound with v-model:sort. Null means unsorted. */
export interface DataTableSort {
  key: string;
  direction: 'ascending' | 'descending';
}
