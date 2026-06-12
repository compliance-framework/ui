import type { Evidence } from '@/stores/evidence';

export interface SelectOption {
  name?: string;
  label?: string;
  value: string;
}

export interface SearchableEvidence extends Evidence {
  searchText: string;
}

export interface LabelCondition {
  name: string;
  value: string;
}
