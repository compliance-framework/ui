import type { BackMatter, Metadata } from './metadata';

export interface Profile {
  uuid: string;
  metadata: Metadata;
  backMatter?: BackMatter;
}
