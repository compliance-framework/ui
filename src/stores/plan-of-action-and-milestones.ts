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

    async function create(poam: Partial<PlanOfActionAndMilestones>): Promise<DataResponse<PlanOfActionAndMilestones>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(poam, { separator: '-' })),
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

    async function update(id: string, poam: PlanOfActionAndMilestones): Promise<DataResponse<PlanOfActionAndMilestones>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(poam, { separator: '-' })),
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

    async function updateMetadata(id: string, metadata: Metadata): Promise<DataResponse<Metadata>> {
      throw new Error('Update functionality is currently disabled');
    }

    async function updatePoamItem(id: string, itemId: string, item: PoamItem): Promise<DataResponse<PoamItem>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/poam-items/${itemId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(item, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<PoamItem>;
    }

    async function createPoamItem(id: string, item: Partial<PoamItem>): Promise<DataResponse<PoamItem>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/poam-items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(item, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<PoamItem>;
    }

    async function deletePoamItem(id: string, itemId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/poam-items/${itemId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    // Observation functions
    async function getObservations(id: string): Promise<DataResponse<Observation[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/observations`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Observation[]>;
    }

    async function createObservation(id: string, observation: Partial<Observation>): Promise<DataResponse<Observation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/observations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(observation, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Observation>;
    }

    async function updateObservation(id: string, observationId: string, observation: Observation): Promise<DataResponse<Observation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/observations/${observationId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(observation, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Observation>;
    }

    async function deleteObservation(id: string, observationId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/observations/${observationId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
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

    // OSCAL POAM endpoints
    async function getImportSsp(id: string): Promise<DataResponse<any>> {
      throw new Error('Import SSP endpoint not yet implemented in backend');
    }

    async function getSystemId(id: string): Promise<DataResponse<any>> {
      throw new Error('System ID endpoint not yet implemented in backend');
    }

    async function getLocalDefinitions(id: string): Promise<DataResponse<any>> {
      throw new Error('Local Definitions endpoint not yet implemented in backend');
    }



    // Finding functions
    async function getFindings(id: string): Promise<DataResponse<Finding[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/findings`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Finding[]>;
    }

    async function createFinding(id: string, finding: Partial<Finding>): Promise<DataResponse<Finding>> {
      const config = await configStore.getConfig();
      const decamelizedFinding = decamelizeKeys(finding, { separator: '-' });
      console.log('Decamelized finding payload:', decamelizedFinding);
      console.log('Decamelized finding JSON:', JSON.stringify(decamelizedFinding, null, 2));
      
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/findings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizedFinding),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Finding>;
    }

    async function updateFinding(id: string, findingId: string, finding: Finding): Promise<DataResponse<Finding>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/findings/${findingId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(finding, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Finding>;
    }

    async function deleteFinding(id: string, findingId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/findings/${findingId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    // Risk functions
    async function getRisks(id: string): Promise<DataResponse<Risk[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/risks`,
        {
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Risk[]>;
    }

    async function createRisk(id: string, risk: Partial<Risk>): Promise<DataResponse<Risk>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/risks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(risk, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Risk>;
    }

    async function updateRisk(id: string, riskId: string, risk: Risk): Promise<DataResponse<Risk>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/risks/${riskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(risk, { separator: '-' })),
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Risk>;
    }

    async function deleteRisk(id: string, riskId: string): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/plan-of-action-and-milestones/${id}/risks/${riskId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getBackMatter(id: string): Promise<DataResponse<BackMatter>> {
      throw new Error('Back Matter endpoint not yet implemented in backend');
    }

    return {
      // GET functions (enabled)
      get,
      list,
      full,
      getMetadata,
      getPoamItems,
      getImportSsp,
      getSystemId,
      getLocalDefinitions,
      getObservations,
      getRisks,
      createRisk,
      updateRisk,
      deleteRisk,
      getFindings,
      createFinding,
      updateFinding,
      deleteFinding,
      getBackMatter,

      // Create/Update functions (disabled for now)
      create,
      update,
      updateMetadata,
      updatePoamItem,
      createPoamItem,
      deletePoamItem,
      createObservation,
      updateObservation,
      deleteObservation,
      updateRole,
      createRole,
      updateParty,
      createParty,
      updateLocation,
      createLocation,
    };
  },
); 