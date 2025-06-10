import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type {
  DataResponse,
  Link,
  Metadata,
  Property,
  Protocol,
} from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';
import { useUserStore } from '@/stores/auth';

export interface Diagram {
  uuid: string;
  description: string;
  props: Property[];
  links: Link[];
  caption: string;
  remarks: string;
}

export interface DiagramGrouping {
  uuid: string;
  description: string;
  remarks: string;
  props: Property[];
  links: Link[];
  diagrams: Diagram[];
}

export interface SystemCharacteristics {
  systemName?: string;
  systemNameShort?: string;
  description?: string;
  dateAuthorized?: Date;
  securitySensitivityLevel?: string;
  remarks?: string;
}

export interface SystemImplementation {
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface SystemImplementationUser {
  uuid: string;
  title: string;
  shortName: string;
  description: string;
  props: Property[];
  links: Link[];
  roleIds?: string[];
  authorizedPrivileges?: AuthorizedPrivilege[];
}

export interface AuthorizedPrivilege {
  title: string;
  description: string;
  props: Property[];
  links: Link[];
  functionsPerformed?: string[];
}

export interface SystemComponentStatus {
  remarks: string;
  state: string;
}

export interface SystemComponent {
  uuid: string;
  type: string;
  title: string;
  description: string;
  purpose: string;
  status: SystemComponentStatus;
  protocols: Protocol[];
  remarks: string;
  props: Property[];
  links: Link[];
}

export interface SystemSecurityPlan {
  uuid: string;
  metadata: Metadata;
  systemCharacteristics: SystemCharacteristics;
}

export const useSystemSecurityPlanStore = defineStore(
  'system-security-plans',
  () => {
    const configStore = useConfigStore();
    const userStore = useUserStore();

    async function get(id: string): Promise<DataResponse<SystemSecurityPlan>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );
      return (await response.json()) as DataResponse<SystemSecurityPlan>;
    }

    async function list(): Promise<DataResponse<SystemSecurityPlan[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );
      return (await response.json()) as DataResponse<SystemSecurityPlan[]>;
    }

    async function getCharacteristics(
      id: string,
    ): Promise<DataResponse<SystemCharacteristics>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );

      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemCharacteristics>;
    }

    async function updateCharacteristics(
      id: string,
      characteristics: SystemCharacteristics,
    ): Promise<DataResponse<SystemCharacteristics>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userStore.token}`
          },
          body: JSON.stringify(
            decamelizeKeys(characteristics, { separator: '-' }),
          ),
        },
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      return camelcaseKeys(
        await response.json(),
      ) as DataResponse<SystemCharacteristics>;
    }

    async function getCharacteristicsAuthorizationBoundary(
      id: string,
    ): Promise<DataResponse<DiagramGrouping>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics/authorization-boundary`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );

      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<DiagramGrouping>;
    }

    async function getCharacteristicsNetworkArchitecture(
      id: string,
    ): Promise<DataResponse<DiagramGrouping>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics/network-architecture`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );

      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<DiagramGrouping>;
    }

    async function updateCharacteristicsAuthorizationBoundaryDiagram(
      id: string,
      diagram: Diagram,
    ): Promise<DataResponse<Diagram>> {
      const config = await configStore.getConfig();
      return await saveDiagram(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics/authorization-boundary/diagrams/${diagram.uuid}`,
        diagram,
      );
    }

    async function updateCharacteristicsNetworkArchitectureDiagram(
      id: string,
      diagram: Diagram,
    ): Promise<DataResponse<Diagram>> {
      const config = await configStore.getConfig();
      return await saveDiagram(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics/network-architecture/diagrams/${diagram.uuid}`,
        diagram,
      );
    }

    async function updateCharacteristicsDataFlowDiagram(
      id: string,
      diagram: Diagram,
    ): Promise<DataResponse<Diagram>> {
      const config = await configStore.getConfig();
      return await saveDiagram(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics/data-flow/diagrams/${diagram.uuid}`,
        diagram,
      );
    }

    async function saveDiagram(
      url: string,
      diagram: Diagram,
    ): Promise<DataResponse<Diagram>> {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStore.token}`,
        },
        body: JSON.stringify(decamelizeKeys(diagram, { separator: '-' })),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      return camelcaseKeys(await response.json()) as DataResponse<Diagram>;
    }

    async function getCharacteristicsDataFlow(
      id: string,
    ): Promise<DataResponse<DiagramGrouping>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics/data-flow`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );

      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<DiagramGrouping>;
    }

    async function getSystemImplementation(
      id: string,
    ): Promise<DataResponse<SystemImplementation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );

      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemImplementation>;
    }

    async function getSystemImplementationUsers(
      id: string,
    ): Promise<DataResponse<SystemImplementationUser[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/users`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );

      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemImplementationUser[]>;
    }

    async function getSystemImplementationComponents(
      id: string,
    ): Promise<DataResponse<SystemComponent[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/components`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );

      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemComponent[]>;
    }

    return {
      get,
      list,
      getCharacteristics,
      getCharacteristicsAuthorizationBoundary,
      getCharacteristicsNetworkArchitecture,
      updateCharacteristicsAuthorizationBoundaryDiagram,
      updateCharacteristicsNetworkArchitectureDiagram,
      updateCharacteristicsDataFlowDiagram,
      getCharacteristicsDataFlow,
      updateCharacteristics,

      getSystemImplementation,
      getSystemImplementationUsers,
      getSystemImplementationComponents,
    };
  },
);
