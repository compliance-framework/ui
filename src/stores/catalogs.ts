import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse, Link, Metadata, Part, Property } from '@/stores/types.ts'

export interface Catalog {
  uuid: string
  metadata: Metadata
}

export interface Group {
  id: string;
  title: string;
  class?: string;
  parts: Part[];
  links: Link[]
  props: Property[]
}

export interface Control {
  id: string;
  title: string;
  class: string;
  parts: Part[];
  links: Link[]
  props: Property[]
}

export const useCatalogStore = defineStore('catalogs', () => {
  const configStore = useConfigStore()

  async function get(id: string): Promise<DataResponse<Catalog>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${id}`)
    return (await response.json()) as DataResponse<Catalog>
  }

  async function list(): Promise<DataResponse<Catalog[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs`)
    return (await response.json()) as DataResponse<Catalog[]>
  }

  async function create(catalog: Catalog): Promise<DataResponse<Catalog>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(catalog),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<Catalog>
  }

  async function createGroup(catalog: Catalog, group: Group): Promise<DataResponse<Group>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalog.uuid}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(group),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<Group>
  }

  async function createGroupGroup(catalog: Catalog, parent: Group, group: Group): Promise<DataResponse<Group>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalog.uuid}/groups/${parent.id}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(group),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<Group>
  }

  async function createGroupControl(catalog: Catalog, parent: Group, control: Control): Promise<DataResponse<Control>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalog.uuid}/groups/${parent.id}/controls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(control),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<Control>
  }

  async function listGroups(catalogId: string): Promise<DataResponse<Group[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalogId}/groups`)
    return (await response.json()) as DataResponse<Group[]>
  }

  async function listGroupGroups(catalogId: string, group: Group): Promise<DataResponse<Group[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalogId}/groups/${group.id}/groups`)
    return (await response.json()) as DataResponse<Group[]>
  }

  async function listGroupControls(catalogId: string, group: Group): Promise<DataResponse<Control[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalogId}/groups/${group.id}/controls`)
    return (await response.json()) as DataResponse<Control[]>
  }

  async function createControl(catalog: Catalog, control: Control): Promise<DataResponse<Control>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalog.uuid}/controls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(control),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<Control>
  }

  async function createControlControl(catalog: Catalog, parent: Control, control: Control): Promise<DataResponse<Control>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalog.uuid}/controls/${parent.id}/controls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(control),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return (await response.json()) as DataResponse<Control>
  }

  async function listControls(catalogId: string): Promise<DataResponse<Control[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalogId}/controls`)
    return (await response.json()) as DataResponse<Control[]>
  }

  async function listControlControls(catalogId: string, control: Control): Promise<DataResponse<Control[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/catalogs/${catalogId}/controls/${control.id}/controls`)
    return (await response.json()) as DataResponse<Control[]>
  }

  return {
    get,
    list,
    create,

    listGroups,
    createGroup,
    listGroupGroups,
    createGroupGroup,

    listControls,
    createControl,
    listControlControls,
    createControlControl,
    listGroupControls,
    createGroupControl,
  }
})
