import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse, Metadata } from '@/stores/types.ts';

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

    return {
      get,
      list,
    };
  },
);
