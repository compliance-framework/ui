import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse, Link, Parent, Part, Property } from '@/stores/types.ts'
import type { Catalog } from '@/stores/catalogs.ts'

export interface Group {
  uuid: string;
  id: string;
  title: string;
  class: string;
  parts: Part[];
  parent: Parent;
  links: Link[]
  props: Property[]
}

export const useGroupsStore = defineStore('groups', () => {
  const configStore = useConfigStore()

  async function catalog(catalog: Catalog): Promise<DataResponse<Group[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/groups/catalog/${catalog.uuid}`)
    return (await response.json()) as DataResponse<Group[]>
  }

  async function children(catalog: Catalog, group: Group): Promise<DataResponse<Group[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/groups/catalog/${catalog.uuid}/${group.class}/${group.id}`)
    return (await response.json()) as DataResponse<Group[]>
  }

  return {
    catalog,
    children,
  }
})
