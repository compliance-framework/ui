import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type {
  Activity, DataResponse,
  Link,
  Origin,
  Property,
  RelevantEvidence
} from '@/stores/types.ts'

export interface Observation {
  _id?: string;
  uuid: string;
  title: string;
  description: string;
  remarks?: string;
  collected: string; // ISO 8601
  expires: string; // ISO 8601
  origins?: Origin[];
  subjects?: string[];
  activities?: Activity[];
  components?: string[];
  relevantEvidence?: RelevantEvidence[];
  links?: Link[];
  props?: Property[];
}

export const useObservationsStore = defineStore('observations', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<Observation>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/observations/${id}`);
    return (await response.json()) as DataResponse<Observation>;
  }

  async function history(uuid: string): Promise<DataResponse<Observation[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/observations/history/${uuid}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return (await response.json()) as DataResponse<Observation[]>;
  }

  return {
    get: get,
    history: history,
  };
});
