import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config';
import type {
  DataResponse,
  FindingStatus,
  Link,
  Metadata,
  Property,
} from '@/stores/types';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

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

export interface PoamItem {
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

export interface Finding {
  uuid?: string;
  title?: string;
  description: string;
  target: any; // Required field
  implementationStatus?: any;
  status?: FindingStatus;
  relatedObservations?: any[];
  relatedRisks?: any[];
  props?: Property[];
  links?: Link[];
  origins?: Origin[];
  remarks?: string;
}

export interface Resource {
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
  resources?: Resource[];
}

export interface ImportSsp {
  href: string;
  remarks?: string;
}

export interface SystemId {
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

export interface LocalDefinitions {
  components?: SystemComponent[];
  inventoryItems?: InventoryItem[];
  assessmentAssets?: AssessmentAssets;
  remarks?: string;
}

export interface PlanOfActionAndMilestones {
  uuid: string;
  metadata: Metadata;
  poamItems: PoamItem[];
  backMatter?: BackMatter;
  systemId?: SystemId;
  remarks?: string;
}
