import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse } from '@/stores/types.ts'

export interface CatalogMetadata {
  title: string
}

export interface Catalog {
  uuid: string
  metadata: CatalogMetadata
}

export const useCatalogStore = defineStore('catalogs', () => {
  const configStore = useConfigStore()

  async function get(id: string): Promise<DataResponse<Catalog>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/catalogs/${id}`)
    return (await response.json()) as DataResponse<Catalog>
  }

  async function list(): Promise<DataResponse<Catalog[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/catalogs`)
    return (await response.json()) as DataResponse<Catalog[]>
  }

  return {
    get,
    list,
  }
})
