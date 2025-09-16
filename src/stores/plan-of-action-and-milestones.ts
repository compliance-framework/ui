/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Link, Property, Finding as OFinding, Metadata } from '@/oscal';

export interface Revision {
  title?: string;
  published?: string;
  lastModified?: string;
  version: string;
  oscalVersion?: string;
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface DocumentId {
  scheme?: string;
  identifier?: string;
}

export interface Role {
  id: string;
  title: string;
  shortName?: string;
  description?: string;
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface Address {
  type?: string;
  addrLines?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface TelephoneNumber {
  type?: string;
  number?: string;
}

export interface Location {
  uuid: string;
  title?: string;
  address?: Address;
  emailAddresses?: string[];
  telephoneNumbers?: TelephoneNumber[];
  urls?: string[];
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface Party {
  uuid: string;
  type: string;
  name: string;
  shortName?: string;
  externalIds?: DocumentId[];
  props?: Property[];
  links?: Link[];
  emailAddresses?: string[];
  telephoneNumbers?: TelephoneNumber[];
  addresses?: Address[];
  locationUuids?: string[];
  memberOfOrganizations?: string[];
  remarks?: string;
}

export interface RelatedFinding {
  findingUuid: string;
}

export interface AssociatedRisk {
  riskUuid: string;
}

export interface Origin {
  actors: Actor[];
}

export interface Actor {
  type: string;
  actorUuid: string;
  roleId?: string;
  props?: Property[];
  links?: Link[];
}

export interface RelatedObservation {
  observationUuid: string;
}

export interface POAMItem {
  uuid?: string;
  title: string;
  description: string;
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  relatedFindings?: RelatedFinding[];
  relatedObservations?: RelatedObservation[];
  relatedRisks?: AssociatedRisk[];
  remarks?: string;
}

export interface Observation {
  uuid?: string;
  title?: string;
  description: string;
  methods: string[];
  types?: string[];
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  subjects?: string[];
  relevantEvidence?: string[];
  collected?: string;
  expires?: string;
  remarks?: string;
}

export interface Risk {
  uuid?: string;
  title?: string;
  description: string;
  statement?: string;
  status: string; // Required field
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  threatIds?: string[];
  characterizations?: any[];
  mitigatingFactors?: any[];
  deadline?: string;
  remediations?: any[];
  relatedObservations?: string[];
  riskLog?: any;
  remarks?: string;
}

export type Finding = OFinding;

export interface BackMatterResource {
  uuid: string;
  title?: string;
  description?: string;
  props?: Property[];
  documentIds?: DocumentId[];
  citation?: {
    text: string;
    props?: Property[];
    links?: Link[];
  };
  rlinks?: {
    href: string;
    mediaType?: string;
    hashes?: {
      algorithm: string;
      value?: string;
    }[];
  }[];
  base64?: {
    filename?: string;
    mediaType?: string;
    value?: string;
  };
  remarks?: string;
}

export interface BackMatter {
  resources?: BackMatterResource[];
}

export interface ImportSSP {
  href: string;
  remarks?: string;
}

export interface SystemID {
  id?: string;
  identifier?: string;
  identifierType?: string;
  props?: Property[];
  links?: Link[];
  remarks?: string;
}

export interface SystemComponent {
  uuid: string;
  type: string;
  title: string;
  description?: string;
  status: {
    state: string;
    reason?: string;
    remarks?: string;
  };
  props?: Property[];
  links?: Link[];
  responsibleRoles?: {
    roleId: string;
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  protocols?: any[];
  remarks?: string;
}

export interface InventoryItem {
  uuid: string;
  description: string;
  props?: Property[];
  links?: Link[];
  responsibleParties?: {
    roleId: string;
    partyUuids: string[];
    props?: Property[];
    links?: Link[];
    remarks?: string;
  }[];
  implementedComponents?: {
    componentUuid: string;
    props?: Property[];
    links?: Link[];
    responsibleParties?: {
      roleId: string;
      partyUuids: string[];
      props?: Property[];
      links?: Link[];
      remarks?: string;
    }[];
    remarks?: string;
  }[];
  remarks?: string;
}

export interface AssessmentAssets {
  components?: SystemComponent[];
  assessmentPlatforms?: {
    uuid: string;
    title?: string;
    props?: Property[];
    links?: Link[];
    usesComponents?: {
      componentUuid: string;
      props?: Property[];
      links?: Link[];
      remarks?: string;
    }[];
    remarks?: string;
  }[];
}

export interface POAMLocalDefinitions {
  components?: SystemComponent[];
  inventoryItems?: InventoryItem[];
  assessmentAssets?: AssessmentAssets;
  remarks?: string;
}

export interface POAM {
  uuid: string;
  metadata: Metadata;
  poamItems: POAMItem[];
  backMatter?: BackMatter;
  systemId?: SystemID;
  remarks?: string;
}
