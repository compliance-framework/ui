import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse } from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

export interface CCFUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  lastLogin?: Date;
  isActive?: boolean;
  isLocked?: boolean;
  failedLogins: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const useUserManagementStore = defineStore('user-management', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<CCFUser>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/users/${id}`, {
      credentials: 'include',
    });
    return decamelizeKeys(await response.json()) as DataResponse<CCFUser>;
  }

  async function list(): Promise<DataResponse<CCFUser[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/users`, {
      credentials: 'include',
    });
    return camelcaseKeys(await response.json(), { deep: true }) as DataResponse<CCFUser[]>;
  }

  return {
    get,
    list,
  };
});
