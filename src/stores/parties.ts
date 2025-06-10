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
    const userStore = useUserStore();

    async function get(id: string): Promise<DataResponse<Party>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/parties/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
        }
      );
      return decamelizeKeys(await response.json()) as DataResponse<Party>;
    }

    async function list(): Promise<DataResponse<Party[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/parties`,
        {
          headers: {
            'Authorization': `Bearer ${userStore.token}`
          }
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
