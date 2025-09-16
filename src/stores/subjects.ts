import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse } from '@/stores/types.ts';
import type { Link, Property } from '@/oscal';

export interface Subject {
  _id: string;
  uuid: string;
  type: string;
  title?: string;
  remarks?: string;
  attributes: Record<string, string>;
  links?: Link[];
  props?: Property[];
}

export const useSubjectsStore = defineStore('subjects', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<Subject>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/subjects/${id}`);
    return (await response.json()) as DataResponse<Subject>;
  }

  return {
    get: get,
  };
});
