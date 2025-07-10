import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse, Metadata } from '@/stores/types.ts';
import decamelizeKeys from 'decamelize-keys';
import type { BackMatterResource } from './component-definitions';
import camelcaseKeys from 'camelcase-keys';

export interface Profile {
  uuid: string;
  metadata: Metadata;
}

export interface Import {
  href: string;
  includeControls: SelectControlsByID[];
  excludeControls: SelectControlsByID[];
}

export interface SelectControlsByID {
  withIds: string[];
  withChildControls?: string;
  matching?: { pattern: string };
}

export interface Merge {
  asIs?: boolean;
  combine?: MergeCombine;
  flat?: object
}

export type MergeOptions = 'asIs' | 'flat' | 'custom';
export type MergeCombineOptions = 'use-first' | 'flat';

export interface MergeCombine {
  method: MergeCombineOptions;
}

export interface BackMatter {
  resources: BackMatterResource[];
}

export const useProfileStore = defineStore('profiles', () => {
  const configStore = useConfigStore();

  async function list(): Promise<DataResponse<Profile[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/profiles`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json()) as DataResponse<Profile[]>;
  }

  async function get(id: string): Promise<DataResponse<Profile>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json(), {deep: true}) as DataResponse<Profile>;
  }

  async function listImports(id: string): Promise<DataResponse<Import[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}/imports`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json(), { deep: true }) as DataResponse<Import[]>;
  }

  async function addImport(profileId: string, uuid: string): Promise<DataResponse<Import>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${profileId}/imports/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uuid: uuid, type: 'catalog' }),
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json(), { deep: true }) as DataResponse<Import>;
  }

  async function updateImport(profileId: string, importData: Import): Promise<DataResponse<Import>> {
    const config = await configStore.getConfig();
    const encodedHref = encodeURIComponent(importData.href);

    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${profileId}/imports/${encodedHref}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(importData, { deep: true, separator: '-' })),
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json(), { deep: true }) as DataResponse<Import>;
  }

  async function deleteImport(profileId: string, href: string): Promise<void> {
    const config = await configStore.getConfig();
    const encodedHref = encodeURIComponent(href);
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${profileId}/imports/${encodedHref}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }

    return;
  }

  async function getMerge(id: string): Promise<DataResponse<Merge>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}/merge`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json(), { deep: true }) as DataResponse<Merge>;
  }

  async function updateMerge(id: string, merge: Merge): Promise<DataResponse<Merge>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}/merge`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decamelizeKeys(merge, { separator: '-' })),
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json(), { deep: true }) as DataResponse<Merge>;
  }

  async function getBackMatter(id: string): Promise<DataResponse<BackMatter>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}/back-matter`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw response;
    }
    return camelcaseKeys(await response.json(), { deep: true }) as DataResponse<BackMatter>;
  }

  return {
    list,
    get,
    listImports,
    addImport,
    updateImport,
    deleteImport,
    getMerge,
    updateMerge,
    getBackMatter,
  }
});
