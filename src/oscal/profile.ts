import type { BackMatter, Metadata } from './metadata';

export interface Profile {
  uuid: string;
  metadata: Metadata;
  imports: Import[];
  merge?: Merge;
  modify?: Modify;
  backMatter?: BackMatter;
}

export interface Import {
  href: string;
  includeControls?: ProfileSelectControlByID[];
  excludeControls?: ProfileSelectControlByID[];
}

export interface Merge {
  asIs?: boolean;
  combine?: MergeCombine;
  flat?: object;
}

export type MergeOptions = 'asIs' | 'flat' | 'custom';
export type MergeCombineOptions = 'use-first' | 'flat';

export interface MergeCombine {
  method: MergeCombineOptions;
}

export interface Modify {
  setParameters: unknown[];
  alters: unknown[];
}

export interface InsertControls {
  order?: InsertControlsOrder;
  includeAll?: boolean;
  includeControls?: ProfileSelectControlByID[];
  excludeControls?: ProfileSelectControlByID[];
}

enum InsertControlsOrder {
  Keep = 'keep',
  Ascending = 'ascending',
  Descending = 'descending',
}

export interface ProfileSelectControlByID {
  withChildControls?: ProfileSelectControlsByIDWithChildControls | string;
  withIds?: string[];
  matching?: Matching;
}

enum ProfileSelectControlsByIDWithChildControls {
  Yes = 'yes',
  No = 'no',
}

export interface Matching {
  pattern?: string;
}
