import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse, Metadata } from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys'
import decamelizeKeys from 'decamelize-keys'

export interface SystemCharacteristics {
  systemName?: string;
  systemNameShort?: string;
  description?: string;
  dateAuthorized?: Date;
  securitySensitivityLevel?: string;
  remarks?: string;
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
      );
      return (await response.json()) as DataResponse<SystemSecurityPlan>;
    }

    async function list(): Promise<DataResponse<SystemSecurityPlan[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans`,
      );
      return (await response.json()) as DataResponse<SystemSecurityPlan[]>;
    }

    async function getCharacteristics(id: string): Promise<DataResponse<SystemCharacteristics>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics`,
      );

      return camelcaseKeys((await response.json()), {deep: true}) as DataResponse<SystemCharacteristics>;
    }

    async function updateCharacteristics(id: string, characteristics: SystemCharacteristics): Promise<DataResponse<SystemCharacteristics>> {
      const config = await configStore.getConfig()
      const response = await fetch(`${config.API_URL}/api/oscal/system-security-plans/${id}/system-characteristics`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(decamelizeKeys(characteristics, {separator: '-'})),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`)
      }

      return camelcaseKeys((await response.json())) as DataResponse<SystemCharacteristics>
    }

    return {
      get,
      list,
      getCharacteristics,
      updateCharacteristics,
    };
  },
);
