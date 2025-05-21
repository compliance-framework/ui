import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse, Property, Link } from '@/stores/types.ts'
import camelcaseKeys from 'camelcase-keys'

export interface ProfileMetadata {
  title: string;
}

export interface Profile {
  uuid: string;
  metadata: ProfileMetadata;
}

export interface Import {
  href: string
  includeAll: object
  includeControls: SelectControlById[]
  excludeControls: SelectControlById[]
}

export interface SelectControlById {
  withChildControls?: string
  withIds?: string[]
  matching: object
}


export interface Merge {
  'as-is': boolean
  combine: object
  flat: object
}


export interface ParameterSetting {
  paramId: string
  class?: string
  dependsOn?: string
  props?: Property[]
  links?: Link[]
  label?: string
  constraints: object[]

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

    return camelcaseKeys(await response.json(), {deep: true}) as DataResponse<Import[]>
  }

  async function getMerge(id: string): Promise<DataResponse<Merge>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/profiles/${id}/merge`)
    return (await response.json()) as DataResponse<Merge>
  }

  return {
    list,
    get,
    listImports,
    getMerge,
  }
})
