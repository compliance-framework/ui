import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse, Link, Parent, Part, Property } from '@/stores/types.ts'
import type { Group } from '@/stores/groups.ts'
import type { Catalog } from '@/stores/catalogs.ts'

export interface Control {
  uuid: string;
  id: string;
  title: string;
  class: string;
  parts: Part[];
  parent: Parent;
  links: Link[]
  props: Property[]
}

export const useControlStore = defineStore('controls', () => {
  const configStore = useConfigStore()

  async function group(catalog: Catalog, group: Group): Promise<DataResponse<Control[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/controls/group/${catalog.uuid}/${group.class}/${group.id}`)
    return (await response.json()) as DataResponse<Control[]>
  }

  async function children(catalog: Catalog, control: Control): Promise<DataResponse<Control[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/controls/control/${catalog.uuid}/${control.class}/${control.id}`)
    return (await response.json()) as DataResponse<Control[]>
  }

  return {
    group,
    children,
  }
})
