import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import { type Filter } from '@/parsers/labelfilter.ts';
import type { DataResponse } from '@/stores/types.ts';
import type { Control } from '@/stores/catalogs.ts';
import type { ComplianceIntervalStatus } from '@/stores/evidence.ts';

export interface Dashboard {
  id?: string;
  uuid?: string;
  name: string;
  filter: Filter;
  controls: Control[];
}

/** Used for creating a Dashboard: controls passed as an array of IDs */
export interface DashboardCreate extends Omit<Dashboard, 'controls'> {
  controls: string[];
}

export const useFilterStore = defineStore('filters', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<Dashboard>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/filters/${id}`);
    return (await response.json()) as DataResponse<Dashboard>;
  }

  async function list(): Promise<DataResponse<Dashboard[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/filters`);
    return (await response.json()) as DataResponse<Dashboard[]>;
  }

  async function create(plan: DashboardCreate): Promise<Dashboard> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/filters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plan),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = (await response.json()) as DataResponse<Dashboard>;
    return data.data as Dashboard;
  }

  async function destroy(id: string): Promise<void> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/filters/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return;
  }

  return {
    get,
    list,
    create,
    destroy,
  };
});
