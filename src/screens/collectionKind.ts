import type { Component } from 'vue';

/**
 * One collection inside a record (a POA&M's risks, an SSP's users...), as RecordCollection
 * renders it: how an entry reads (title, tags, facts) and its classic create and edit forms, which
 * take the record's id as a prop and emit `created` and `saved`.
 */
export interface CollectionEntry {
  uuid?: string;
  title?: string;
  description?: string;
}

export interface CollectionFact {
  key: string;
  label: string;
  value?: string;
}

export interface CollectionKind {
  noun: string;
  plural: string;
  /** The permission resource for create, update and delete. */
  resource: string;
  emptyBody: string;
  /** The entry prop the edit form takes. */
  editProp: string;
  title?: (entry: never) => string | undefined;
  tags: (entry: never) => string[];
  facts: (entry: never) => CollectionFact[];
  createForm: () => Promise<Component>;
  editForm: () => Promise<Component>;
  /** Adds "Download JSON" for each entry. */
  download?: boolean;
}
