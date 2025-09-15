import type {
  HasPropAndLink,
  Link,
  Property,
  ResponsibleParty,
} from './common';

export interface Metadata extends HasPropAndLink {
  title: string;
  version: string;
  lastModified: string;
  published?: string;
  oscalVersion: string;
  revisions?: Revision[];
  documentIDs?: DocumentID[];
  roles?: Role[];
  locations?: Location[];
  parties?: Party[];
  responsibleParties?: ResponsibleParty[];
  actions?: Action[];
  remarks?: string;
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

export interface Revision extends HasPropAndLink {
  title?: string;
  published?: string;
  lastModified?: string;
  version: string;
  oscalVersion?: string;
  remarks?: string;
}

export interface Role extends HasPropAndLink {
  id: string;
  title: string;
  shortName?: string;
  description?: string;
  remarks?: string;
}

export interface Location extends HasPropAndLink {
  uuid: string;
  title?: string;
  address?: Address;
  emailAddresses?: string[];
  telephoneNumbers?: TelephoneNumber[];
  urls?: string[];
  remarks?: string;
}

export interface Party extends HasPropAndLink {
  uuid: string;
  type: PartyType | string;
  name?: string;
  shortName?: string;
  externalIDs?: ExternalID[];
  emailAddresses?: string[];
  telephoneNumbers?: TelephoneNumber[];
  addresses?: Address[];
  locationUuids?: string[];
  memberOfOrganizations?: string[];
  remarks?: string;
}

enum PartyType {
  Person = 'person',
  Organization = 'organization',
}

export interface ExternalID {
  id: string;
  scheme: ExternalIDScheme | string;
}

enum ExternalIDScheme {
  ORCID = 'http://orcid.org/',
}

export interface Action extends HasPropAndLink {
  uuid: string;
  date?: string;
  type: string;
  system: string;
  responsibleParties?: ResponsibleParty[];
  remarks?: string;
}

export interface TelephoneNumber {
  type?: TelephoneNumberType | string;
  number: string;
}

enum TelephoneNumberType {
  Home = 'home',
  Office = 'office',
  Mobile = 'mobile',
}

export interface Address {
  type?: AddressType | string;
  addrLines?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

enum AddressType {
  Home = 'home',
  Work = 'work',
}
