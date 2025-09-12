import type { Link, Property } from './common';

export interface Metadata {
  title: string;
  remarks?: string;
  version?: string;
  lastModified?: string;
  published?: string;
  oscalVersion?: string;
}

export interface BackMatter {
  resources: BackMatterResource[];
}

export interface BackMatterResource {
  uuid: string;
  title?: string;
  description?: string;
  remarks?: string;
  props?: Property[];

  documentIds?: DocumentID[];
  citation?: Citation;
  base64?: Base64;
  rlinks?: ResourceLink[];
}

enum HashAlgorithm {
  SHA224 = 'SHA-224',
  SHA256 = 'SHA-256',
  SHA384 = 'SHA-384',
  SHA512 = 'SHA-512',
  SHA3224 = 'SHA3-224',
  SHA3256 = 'SHA3-256',
  SHA3384 = 'SHA3-384',
  SHA3512 = 'SHA3-512',
}

export interface Hash {
  value: string;
  algorithm: HashAlgorithm | string;
}

enum DocumentIDScheme {
  DOI = 'http://www.doi.org/',
}

export interface DocumentID {
  identifier: string;
  scheme?: DocumentIDScheme | string;
}

export interface ResourceLink {
  href: string;
  mediaType?: string;
  hashes?: Hash[];
}

export interface Citation {
  text: string;
  props?: Property[];
  links?: Link[];
}

export interface Base64 {
  filename?: string;
  mediaType?: string;
  value: string;
}
