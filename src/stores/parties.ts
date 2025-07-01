import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type {
  DataResponse,
} from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

export interface Address {
  addrLines?: string[];
  city?: string;
  country?: string;
  postalCode?: string;
  state?: string;
  type?: string;
}

export interface Party {
  uuid: string;
  locationUuids: string;
  memberOfOrganizations: string;
  name: string;
  remarks: string;
  shortName: string;
  type: string;

  addresses: Address[];
  emailAddresses: string[];
  telephoneNumbers: string[];
}

export const usePartyStore = defineStore(
  'parties',
  () => {
    const configStore = useConfigStore();
    async function get(id: string): Promise<DataResponse<Party>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/parties/${id}`,
        {
          credentials: 'include',
        }
      );
      return decamelizeKeys(await response.json()) as DataResponse<Party>;
    }
    async function list(): Promise<DataResponse<Party[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/parties`,
        {
          credentials: 'include',
        }
      );
      return camelcaseKeys(await response.json(), {deep:true}) as DataResponse<Party[]>;
    }
    return {
      get,
      list,
    };
  },
);
