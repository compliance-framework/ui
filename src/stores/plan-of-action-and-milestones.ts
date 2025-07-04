import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config';
import type {
  DataResponse,
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

export interface RelatedObservation {
  observationUuid: string;
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

export interface RelatedFinding {
  findingUuid: string;
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

export interface PlanOfActionAndMilestones {
  uuid: string;
  metadata: Metadata;
  poamItems: PoamItem[];
  backMatter?: BackMatter;
  remarks?: string;
}

export const usePlanOfActionAndMilestonesStore = defineStore(
  'plan-of-action-and-milestones',
  () => {
    const configStore = useConfigStore();

    async function get(id: string): Promise<DataResponse<PlanOfActionAndMilestones>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<PlanOfActionAndMilestones>;
    }

    async function list(): Promise<DataResponse<PlanOfActionAndMilestones[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<PlanOfActionAndMilestones[]>;
    }

    async function full(id: string): Promise<DataResponse<PlanOfActionAndMilestones>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/full`,
        {
          credentials: 'include'
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<PlanOfActionAndMilestones>;
    }

    // Create function (disabled for now)
    async function create(poam: Partial<PlanOfActionAndMilestones>): Promise<DataResponse<PlanOfActionAndMilestones>> {
      throw new Error('Create functionality is currently disabled');
    }

    // Update functions (disabled for now)
    async function update(id: string, poam: PlanOfActionAndMilestones): Promise<DataResponse<PlanOfActionAndMilestones>> {
      throw new Error('Update functionality is currently disabled');
    }

    async function updateMetadata(id: string, metadata: Metadata): Promise<DataResponse<Metadata>> {
      throw new Error('Update functionality is currently disabled');
    }

    async function updatePoamItem(id: string, itemId: string, item: PoamItem): Promise<DataResponse<PoamItem>> {
      throw new Error('Update functionality is currently disabled');
    }

    async function createPoamItem(id: string, item: Partial<PoamItem>): Promise<DataResponse<PoamItem>> {
      throw new Error('Create functionality is currently disabled');
    }

    async function updateRole(id: string, roleId: string, role: Role): Promise<DataResponse<Role>> {
      throw new Error('Update functionality is currently disabled');
    }

    async function createRole(id: string, role: Partial<Role>): Promise<DataResponse<Role>> {
      throw new Error('Create functionality is currently disabled');
    }

    async function updateParty(id: string, partyId: string, party: Party): Promise<DataResponse<Party>> {
      throw new Error('Update functionality is currently disabled');
    }

    async function createParty(id: string, party: Partial<Party>): Promise<DataResponse<Party>> {
      throw new Error('Create functionality is currently disabled');
    }

    async function updateLocation(id: string, locationId: string, location: Location): Promise<DataResponse<Location>> {
      throw new Error('Update functionality is currently disabled');
    }

    async function createLocation(id: string, location: Partial<Location>): Promise<DataResponse<Location>> {
      throw new Error('Create functionality is currently disabled');
    }

    // GET functions for specific sections
    async function getMetadata(id: string): Promise<DataResponse<Metadata>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/metadata`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Metadata>;
    }

    async function getPoamItems(id: string): Promise<DataResponse<PoamItem[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/poam-items`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<PoamItem[]>;
    }

    // Note: These endpoints are not yet implemented in the backend
    async function getRoles(id: string): Promise<DataResponse<Role[]>> {
      throw new Error('Roles endpoint not yet implemented in backend');
    }

    async function getParties(id: string): Promise<DataResponse<Party[]>> {
      throw new Error('Parties endpoint not yet implemented in backend');
    }

    async function getLocations(id: string): Promise<DataResponse<Location[]>> {
      throw new Error('Locations endpoint not yet implemented in backend');
    }

    async function getBackMatter(id: string): Promise<DataResponse<BackMatter>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/back-matter`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<BackMatter>;
    }

    return {
      // GET functions (enabled)
      get,
      list,
      full,
      getMetadata,
      getPoamItems,
      getRoles,
      getParties,
      getLocations,
      getBackMatter,

      // Create/Update functions (disabled for now)
      create,
      update,
      updateMetadata,
      updatePoamItem,
      createPoamItem,
      updateRole,
      createRole,
      updateParty,
      createParty,
      updateLocation,
      createLocation,
    };
  },
); 