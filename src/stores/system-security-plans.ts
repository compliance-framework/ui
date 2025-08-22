/* eslint-disable @typescript-eslint/no-explicit-any */

import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config';
import type {
  DataResponse,
  Link,
  Metadata,
  Property,
  Protocol,
} from '@/stores/types';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

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

export interface PortRange {
  transport: string;
  start?: number;
  end?: number;
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
  implementedComponents?: ImplementedComponent[];
  remarks?: string;
}

export interface ImplementedComponent {
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
}

export interface LeveragedAuthorization {
  uuid: string;
  title: string;
  partyUuid: string;
  dateAuthorized: string;
  remarks?: string;
  props?: Property[];
  links?: Link[];
}

export interface ResponsibleRole {
  roleId: string;
  props: Property[];
  links: Link[];
  partyUuids?: string[];
  remarks?: string;
}

export interface SetParameter {
  paramId: string;
  values: string[];
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface ImplementationStatus {
  state: string;
  remarks?: string;
}

export interface ProvidedControlImplementation {
  uuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface ControlImplementationResponsibility {
  uuid: string;
  providedUuid?: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface Export {
  uuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
  provided?: ProvidedControlImplementation[];
  responsibilities?: ControlImplementationResponsibility[];
}

export interface InheritedControlImplementation {
  uuid: string;
  providedUuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface SatisfiedControlImplementationResponsibility {
  uuid: string;
  responsibilityUuid: string;
  description: string;
  props: Property[];
  links: Link[];
  remarks?: string;
}

export interface ByComponent {
  uuid: string;
  componentUuid: string;
  description: string;
  props: Property[];
  links: Link[];
  setParameters?: SetParameter[];
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
  implementationStatus?: ImplementationStatus;
  export?: Export;
  inherited?: InheritedControlImplementation[];
  satisfied?: SatisfiedControlImplementationResponsibility[];
}

export interface Statement {
  uuid: string;
  statementId: string;
  description?: string;
  props: Property[];
  links: Link[];
  responsibleRoles?: ResponsibleRole[];
  byComponents?: ByComponent[];
  remarks?: string;
}

export interface CreateStatementRequest {
  uuid: string;
  statementId: string;
  description?: string;
  props: Property[];
  links: Link[];
  responsibleRoles?: ResponsibleRole[];
  byComponents?: ByComponent[];
  remarks?: string;
}

export interface ImplementedRequirement {
  uuid: string;
  controlId: string;
  props: Property[];
  links: Link[];
  setParameters?: SetParameter[];
  responsibleRoles?: ResponsibleRole[];
  remarks?: string;
  byComponents?: ByComponent[];
  statements?: Statement[];
}

export interface ControlImplementation {
  uuid: string;
  source?: string;
  description: string;
  setParameters?: SetParameter[];
  implementedRequirements: ImplementedRequirement[];
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
    async function get(id: string): Promise<DataResponse<SystemSecurityPlan>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return (await response.json()) as DataResponse<SystemSecurityPlan>;
    }
    async function list(): Promise<DataResponse<SystemSecurityPlan[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return (await response.json()) as DataResponse<SystemSecurityPlan[]>;
    }

    async function attachProfile<T>(
      id: string,
      selectedProfileId: string,
    ): Promise<T> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profileId: selectedProfileId,
          }),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return response.json();
    }

    async function getCharacteristics(
      id: string,
    ): Promise<DataResponse<SystemCharacteristics>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
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
          },
          body: JSON.stringify(
            decamelizeKeys(characteristics, { separator: '-' }),
          ),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
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
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
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
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
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
        },
        body: JSON.stringify(decamelizeKeys(diagram, { separator: '-' })),
        credentials: 'include',
      });
      if (!response.ok) {
        throw response;
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
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
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
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemImplementation>;
    }

    async function updateSystemImplementation(
      id: string,
      systemImplementation: SystemImplementation,
    ): Promise<DataResponse<SystemImplementation>> {
      const config = await configStore.getConfig();
      const requestBody = decamelizeKeys(systemImplementation, {
        separator: '-',
      });

      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        throw response;
      }

      const responseData = await response.json();

      return camelcaseKeys(responseData, {
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
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
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
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      const data = await response.json();

      return camelcaseKeys(data, {
        deep: true,
      }) as DataResponse<SystemComponent[]>;
    }

    async function getSystemImplementationComponent(
      id: string,
      componentId: string,
    ): Promise<DataResponse<SystemComponent>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/components/${componentId}`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemComponent>;
    }

    async function getSystemImplementationInventoryItems(
      id: string,
    ): Promise<DataResponse<InventoryItem[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/inventory-items`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<InventoryItem[]>;
    }

    async function getSystemImplementationLeveragedAuthorizations(
      id: string,
    ): Promise<DataResponse<LeveragedAuthorization[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/leveraged-authorizations`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<LeveragedAuthorization[]>;
    }

    async function createSystemImplementationLeveragedAuthorization(
      id: string,
      auth: Partial<LeveragedAuthorization>,
    ): Promise<DataResponse<LeveragedAuthorization>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/leveraged-authorizations`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(auth, { separator: '-' })),
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<LeveragedAuthorization>;
    }

    async function updateSystemImplementationLeveragedAuthorization(
      id: string,
      authId: string,
      auth: LeveragedAuthorization,
    ): Promise<DataResponse<LeveragedAuthorization>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/leveraged-authorizations/${authId}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(auth, { separator: '-' })),
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<LeveragedAuthorization>;
    }

    async function deleteSystemImplementationLeveragedAuthorization(
      id: string,
      authId: string,
    ): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/leveraged-authorizations/${authId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function updateSystemImplementationInventoryItem(
      id: string,
      itemId: string,
      item: InventoryItem,
    ): Promise<DataResponse<InventoryItem>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/inventory-items/${itemId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(item, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<InventoryItem>;
    }

    async function createSystemImplementationInventoryItem(
      id: string,
      item: InventoryItem,
    ): Promise<DataResponse<InventoryItem>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/inventory-items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(item, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<InventoryItem>;
    }

    async function deleteSystemImplementationUser(
      id: string,
      userId: string,
    ): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/users/${userId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function deleteSystemImplementationInventoryItem(
      id: string,
      itemId: string,
    ): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/inventory-items/${itemId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function deleteSystemImplementationComponent(
      id: string,
      componentId: string,
    ): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/components/${componentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function getControlImplementation(
      id: string,
    ): Promise<DataResponse<any>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<any>;
    }

    async function updateSystemImplementationUser(
      id: string,
      userId: string,
      user: SystemImplementationUser,
    ): Promise<DataResponse<SystemImplementationUser>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(user, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemImplementationUser>;
    }

    async function createSystemImplementationUser(
      id: string,
      user: Partial<SystemImplementationUser>,
    ): Promise<DataResponse<SystemImplementationUser>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(user, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemImplementationUser>;
    }

    async function updateSystemImplementationComponent(
      id: string,
      componentId: string,
      component: SystemComponent,
    ): Promise<DataResponse<SystemComponent>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/components/${componentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(component, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemComponent>;
    }

    async function createSystemImplementationComponent(
      id: string,
      component: Partial<SystemComponent>,
    ): Promise<DataResponse<SystemComponent>> {
      const config = await configStore.getConfig();
      const requestBody = decamelizeKeys(component, { separator: '-' });

      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-implementation/components`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      const responseData = await response.json();

      return camelcaseKeys(responseData, {
        deep: true,
      }) as DataResponse<SystemComponent>;
    }

    async function full(id: string): Promise<DataResponse<SystemSecurityPlan>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/full`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemSecurityPlan>;
    }

    async function create(
      ssp: Partial<SystemSecurityPlan>,
    ): Promise<DataResponse<SystemSecurityPlan>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(ssp, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<SystemSecurityPlan>;
    }

    async function updateControlImplementation(
      id: string,
      controlImplementation: ControlImplementation,
    ): Promise<DataResponse<ControlImplementation>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            decamelizeKeys(controlImplementation, { separator: '-' }),
          ),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ControlImplementation>;
    }

    async function getImplementedRequirements(
      id: string,
    ): Promise<DataResponse<ImplementedRequirement[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation/implemented-requirements`,
        {
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ImplementedRequirement[]>;
    }

    async function createImplementedRequirement(
      id: string,
      requirement: Partial<ImplementedRequirement>,
    ): Promise<DataResponse<ImplementedRequirement>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation/implemented-requirements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(requirement, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ImplementedRequirement>;
    }

    async function updateImplementedRequirement(
      id: string,
      reqId: string,
      requirement: ImplementedRequirement,
    ): Promise<DataResponse<ImplementedRequirement>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation/implemented-requirements/${reqId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(requirement, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ImplementedRequirement>;
    }

    async function deleteImplementedRequirement(
      id: string,
      reqId: string,
    ): Promise<void> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation/implemented-requirements/${reqId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
    }

    async function updateImplementedRequirementStatement(
      id: string,
      reqId: string,
      stmtId: string,
      statement: Statement,
    ): Promise<DataResponse<Statement>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation/implemented-requirements/${reqId}/statements/${stmtId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            decamelizeKeys(statement, { separator: '-', deep: true }),
          ),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Statement>;
    }

    async function createImplementedRequirementStatement(
      id: string,
      reqId: string,
      statement: CreateStatementRequest,
    ): Promise<DataResponse<Statement>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation/implemented-requirements/${reqId}/statements`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(statement, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Statement>;
    }

    async function updateStatementByComponent(
      id: string,
      reqId: string,
      stmtId: string,
      byComponentId: string,
      byComponent: ByComponent,
    ): Promise<DataResponse<ByComponent>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/control-implementation/implemented-requirements/${reqId}/statements/${stmtId}/by-components/${byComponentId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(byComponent, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw response;
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ByComponent>;
    }

    return {
      get,
      list,
      full,
      create,
      attachProfile,

      getCharacteristics,
      getCharacteristicsAuthorizationBoundary,
      getCharacteristicsNetworkArchitecture,
      getCharacteristicsDataFlow,
      updateCharacteristics,
      updateCharacteristicsAuthorizationBoundaryDiagram,
      updateCharacteristicsNetworkArchitectureDiagram,
      updateCharacteristicsDataFlowDiagram,

      getSystemImplementation,
      updateSystemImplementation,
      getSystemImplementationUsers,
      getSystemImplementationComponents,
      getSystemImplementationInventoryItems,
      getSystemImplementationLeveragedAuthorizations,
      createSystemImplementationLeveragedAuthorization,
      updateSystemImplementationLeveragedAuthorization,
      deleteSystemImplementationLeveragedAuthorization,
      updateSystemImplementationUser,
      createSystemImplementationUser,
      deleteSystemImplementationUser,
      getSystemImplementationComponent,
      updateSystemImplementationComponent,
      createSystemImplementationComponent,
      deleteSystemImplementationComponent,
      updateSystemImplementationInventoryItem,
      createSystemImplementationInventoryItem,
      deleteSystemImplementationInventoryItem,

      getControlImplementation,
      updateControlImplementation,
      getImplementedRequirements,
      createImplementedRequirement,
      updateImplementedRequirement,
      deleteImplementedRequirement,
      updateImplementedRequirementStatement,
      createImplementedRequirementStatement,
      updateStatementByComponent,
    };
  },
);
