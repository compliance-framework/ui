import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse } from '@/stores/types.ts'

export interface ProfileMetadata {
  title: string;
}

export interface Profile {
  uuid: string;
  metadata: ProfileMetadata;
}

export interface Import {
  href: string
  includeControls: object[]
  excludeControls: object[]
}


export const useProfileStore = defineStore('profiles', () => {
  const configStore = useConfigStore()

  async function list(): Promise<DataResponse<Profile[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/profiles`)
    return (await response.json()) as DataResponse<Profile[]>
  }

  async function get(id: string): Promise<DataResponse<Profile>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}`)
    return (await response.json()) as DataResponse<Profile>
  }

  async function listImports(id: string): Promise<DataResponse<Import[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}/imports`)

    return (await response.json()) as DataResponse<Import[]>
  }

  return {
    list,
    get,
    listImports,
  }
})
