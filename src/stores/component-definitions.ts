import { defineStore } from 'pinia'
import { useConfigStore } from '@/stores/config.ts'
import type { DataResponse, Link, Metadata, Property } from '@/stores/types.ts'
import { useUserStore } from '@/stores/auth.ts'
import camelcaseKeys from 'camelcase-keys'
import decamelizeKeys from 'decamelize-keys'

export interface ComponentDefinition {
  uuid: string;
  metadata: Metadata;
}

export interface DefinedComponent {
  uuid: string;
  type: string;
  title: string;
  description: string;
  purpose?: string;
  props: Property[];
  links: Link[];
  responsibleRoles?: ResponsibleRole[];
  protocols?: Protocol[];
  controlImplementations?: ControlImplementation[];
}

export interface Capability {
  uuid: string;
  name: string;
  description: string;
  props: Property[];
  links: Link[];
  incorporatesComponents?: IncorporatesComponent[];
  controlImplementations?: ControlImplementation[];
}

export interface ResponsibleRole {
  roleId: string;
  props: Property[];
  links: Link[];
  partyUuids?: string[];
}

export interface Protocol {
  uuid?: string;
  name: string;
  title?: string;
  portRanges?: PortRange[];
}

export interface PortRange {
  start: number;
  end: number;
  transport: string;
}

export interface ControlImplementation {
  uuid: string;
  source: string;
  description: string;
  props: Property[];
  links: Link[];
  implementedRequirements: ImplementedRequirement[];
}

export interface ImplementedRequirement {
  uuid: string;
  controlId: string;
  description: string;
  props: Property[];
  links: Link[];
  statements?: Statement[];
}

export interface Statement {
  statementId: string;
  uuid: string;
  description: string;
  props: Property[];
  links: Link[];
}

export interface IncorporatesComponent {
  componentUuid: string;
  description: string;
}

export interface ImportComponentDefinition {
  href: string;
  includeAll?: boolean;
  includeComponents?: SelectComponentById[];
  excludeComponents?: SelectComponentById[];
}

export interface SelectComponentById {
  componentId: string;
  matchingElements?: MatchingElement[];
}

export interface MatchingElement {
  name: string;
  ns?: string;
  class?: string;
  id?: string;
}

export interface ComponentDefinitionCharacteristics {
  importComponentDefinitions?: ImportComponentDefinition[];
  components?: DefinedComponent[];
  capabilities?: Capability[];
  backMatter?: any[];
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
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ComponentDefinition>
  }

  async function list(): Promise<DataResponse<ComponentDefinition[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      },
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ComponentDefinition[]>
  }

  async function create(componentDefinition: ComponentDefinition): Promise<DataResponse<ComponentDefinition>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(decamelizeKeys(componentDefinition, { separator: '-' })),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ComponentDefinition>
  }

  async function updateImportComponentDefinitions(id: string, importDefinitions: ImportComponentDefinition[]): Promise<DataResponse<ComponentDefinition>> {
    const config = await configStore.getConfig()
    // Backend only supports updating import_component_definitions field through main update
    const componentDefinition = {
      uuid: id,
      metadata: { title: "Placeholder" }, // Backend requires this but ignores updates to it
      importComponentDefinitions: importDefinitions
    }
    
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(decamelizeKeys(componentDefinition, { separator: '-' })),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ComponentDefinition>
  }

  async function full(id: string): Promise<DataResponse<ComponentDefinition>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/full`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ComponentDefinition>
  }

  async function getCharacteristics(id: string): Promise<DataResponse<ComponentDefinitionCharacteristics>> {
    const config = await configStore.getConfig()
    
    // Get all the main content sections like SSP does for characteristics
    const [importDefs, components, capabilities, backMatter] = await Promise.all([
      fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/import-component-definitions`, {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      }),
      fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components`, {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      }),
      fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/capabilities`, {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      }),
      fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/back-matter`, {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      })
    ])

    const characteristics: ComponentDefinitionCharacteristics = {
      importComponentDefinitions: importDefs.ok ? (await importDefs.json()).data : [],
      components: components.ok ? (await components.json()).data : [],
      capabilities: capabilities.ok ? (await capabilities.json()).data : [],
      backMatter: backMatter.ok ? (await backMatter.json()).data : []
    }

    return camelcaseKeys({ data: characteristics }, { deep: true }) as DataResponse<ComponentDefinitionCharacteristics>
  }

  async function getImportComponentDefinitions(id: string): Promise<DataResponse<ImportComponentDefinition[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/import-component-definitions`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ImportComponentDefinition[]>
  }

  async function getComponents(id: string): Promise<DataResponse<DefinedComponent[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<DefinedComponent[]>
  }

  async function getDefinedComponent(id: string, componentId: string): Promise<DataResponse<DefinedComponent>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components/${componentId}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<DefinedComponent>
  }

  async function getControlImplementations(id: string, componentId: string): Promise<DataResponse<ControlImplementation[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components/${componentId}/control-implementations`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ControlImplementation[]>
  }

  async function getCapabilities(id: string): Promise<DataResponse<Capability[]>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/capabilities`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Capability[]>
  }

  async function getBackMatter(id: string): Promise<DataResponse<any>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/back-matter`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<any>
  }

  async function createComponent(id: string, component: DefinedComponent): Promise<DataResponse<DefinedComponent>> {
    const config = await configStore.getConfig()
    const payload = [decamelizeKeys(component, { separator: '-' })]
    
    // Backend expects an array of components, not a single component
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    const result = camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<DefinedComponent[]>
    // Return the first component from the array response
    return { data: result.data[0] } as DataResponse<DefinedComponent>
  }

  async function createCapability(id: string, capability: Capability): Promise<DataResponse<Capability>> {
    const config = await configStore.getConfig()
    // Backend expects an array of capabilities, not a single capability
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/capabilities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify([decamelizeKeys(capability, { separator: '-' })]),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    const result = camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Capability[]>
    // Return the first capability from the array response
    return { data: result.data[0] } as DataResponse<Capability>
  }

  async function updateComponents(id: string, components: DefinedComponent[]): Promise<DataResponse<DefinedComponent[]>> {
    const config = await configStore.getConfig()
    const payload = decamelizeKeys(components, { separator: '-' })
    
    // Use the bulk UpdateComponents endpoint that supports updating title, description, purpose, type, remarks
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/components`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<DefinedComponent[]>
  }

  async function updateComponent(id: string, componentId: string, component: DefinedComponent): Promise<DataResponse<DefinedComponent>> {
    // For single component updates, we'll use the bulk endpoint with a single item array
    const response = await updateComponents(id, [component])
    return { data: response.data[0] } as DataResponse<DefinedComponent>
  }

  async function updateCapability(id: string, capabilityId: string, capability: Capability): Promise<DataResponse<Capability>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/capabilities/${capabilityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(decamelizeKeys(capability, { separator: '-' })),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Capability>
  }

  async function getCapability(id: string, capabilityId: string): Promise<DataResponse<Capability>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/capabilities/${capabilityId}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
      }
    })
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<Capability>
  }

  async function createImportComponentDefinition(id: string, importDef: ImportComponentDefinition): Promise<DataResponse<ImportComponentDefinition>> {
    const config = await configStore.getConfig()
    const response = await fetch(`${config.API_URL}/api/oscal/component-definitions/${id}/import-component-definitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`,
      },
      body: JSON.stringify(decamelizeKeys(importDef, { separator: '-' })),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }
    return camelcaseKeys(await response.json(), {
      deep: true,
    }) as DataResponse<ImportComponentDefinition>
  }

  return {
    get,
    list,
    create,
    full,
    getCharacteristics,
    
    // Import Component Definitions (only field that can be updated via main update endpoint)
    getImportComponentDefinitions,
    createImportComponentDefinition,
    updateImportComponentDefinitions,
    
    // Components (use specific endpoints)
    getComponents,
    getDefinedComponent,
    createComponent,
    updateComponent,
    updateComponents, // Bulk update for multiple components
    getControlImplementations,
    
    // Capabilities (use specific endpoints)
    getCapabilities,
    getCapability,
    createCapability,
    updateCapability,
    
    // Back Matter
    getBackMatter,
    
    // Note: Metadata (title, remarks) cannot be updated via current backend implementation
    // Backend only updates LastModified and OscalVersion automatically
  }
})