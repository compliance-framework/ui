import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type {
  DataResponse,
  Link,
  Property,
} from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

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
    async function get(id: string): Promise<DataResponse<Role>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/parties/${id}`,
        {
          credentials: 'include',
        }
      );
      return decamelizeKeys(await response.json()) as DataResponse<Role>;
    }
    async function list(): Promise<DataResponse<Role[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/roles`,
        {
          credentials: 'include',
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
