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
import type { SystemCharacteristics } from '@/stores/system-security-plans.ts'
import { useUserStore } from '@/stores/auth';

export interface Role {
  id: string;
  title?: string;
  shortName?: string;
  description?: string;
  links: Link[];
  props: Property[];
  remarks?: string;
}

export const useRoleStore = defineStore(
  'roles',
  () => {
    const configStore = useConfigStore();
    const userStore = useUserStore()
    async function get(id: string): Promise<DataResponse<Role>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/parties/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );
      return decamelizeKeys(await response.json()) as DataResponse<Role>;
    }
    async function list(): Promise<DataResponse<Role[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/roles`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );
      return camelcaseKeys(await response.json(), {deep:true}) as DataResponse<Role[]>;
    }
    return {
      get,
      list,
    };
  },
);
