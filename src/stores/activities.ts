import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type {
  DataResponse,
} from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';
import type { Activity } from '@/oscal';

export const useActivityStore = defineStore('activities', () => {
  const configStore = useConfigStore();

  async function get(id: string): Promise<DataResponse<Activity>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/activities/${id}`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Activity>;
  }

  async function create(activity: Activity): Promise<DataResponse<Activity>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(activity, { separator: '-' })),
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Activity>;
  }

  async function update(
    id: string,
    activity: Activity,
  ): Promise<DataResponse<Activity>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/activities/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(decamelizeKeys(activity, { separator: '-' })),
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Activity>;
  }

  async function destroy(id: string): Promise<void> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/activities/${id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
  }

  return {
    get,
    create,
    update,
    destroy,
  };
});
