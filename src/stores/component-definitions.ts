import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse, Metadata } from '@/stores/types.ts'
import { useUserStore } from '@/stores/auth.ts'

export interface ComponentDefinition {
  uuid: string;
  metadata: Metadata;
}

export const useComponentDefinitionStore = defineStore('component-definitions', () => {
  const configStore = useConfigStore()
  const userStore = useUserStore()

  async function get(id: string): Promise<DataResponse<ComponentDefinition>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<ComponentDefinition>
  }

  async function list(): Promise<DataResponse<ComponentDefinition[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      },
    })
    return (await response.json()) as DataResponse<ComponentDefinition[]>
  }

  async function create(componentDefinition: ComponentDefinition): Promise<DataResponse<ComponentDefinition>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(componentDefinition),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return (await response.json()) as DataResponse<ComponentDefinition>
  }

  async function update(id: string, componentDefinition: ComponentDefinition): Promise<DataResponse<ComponentDefinition>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(componentDefinition),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return (await response.json()) as DataResponse<ComponentDefinition>
  }

  async function full(id: string): Promise<DataResponse<ComponentDefinition>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/full`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<ComponentDefinition>
  }

  async function getImportComponentDefinitions(id: string): Promise<DataResponse<any[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/import-component-definitions`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<any[]>
  }

  async function getComponents(id: string): Promise<DataResponse<any[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<any[]>
  }

  async function getDefinedComponent(id: string, componentId: string): Promise<DataResponse<any>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components/${componentId}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<any>
  }

  async function getControlImplementations(id: string, componentId: string): Promise<DataResponse<any[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components/${componentId}/control-implementations`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<any[]>
  }

  async function getCapabilities(id: string): Promise<DataResponse<any[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/capabilities`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<any[]>
  }

  async function getBackMatter(id: string): Promise<DataResponse<any>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/back-matter`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return (await response.json()) as DataResponse<any>
  }

  return {
    get,
    list,
    create,
    update,
    full,
    getImportComponentDefinitions,
    getComponents,
    getDefinedComponent,
    getControlImplementations,
    getCapabilities,
    getBackMatter,
  }
})