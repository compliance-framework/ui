/* eslint-disable @typescript-eslint/no-explicit-any */

import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse } from '@/stores/types.ts';
import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';
import type {
  BackMatter,
  BackMatterResource,
  Capability,
  ComponentDefinition,
  ComponentDefinitionControlImplementation,
  DefinedComponent,
  ImportComponentDefinition,
} from '@/oscal';

export interface ComponentDefinitionCharacteristics {
  importComponentDefinitions?: ImportComponentDefinition[];
  components?: DefinedComponent[];
  capabilities?: Capability[];
  backMatter?: BackMatter;
}

export const useComponentDefinitionStore = defineStore(
  'component-definitions',
  () => {
    const configStore = useConfigStore();

    async function get(id: string): Promise<DataResponse<ComponentDefinition>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ComponentDefinition>;
    }

    async function list(): Promise<DataResponse<ComponentDefinition[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ComponentDefinition[]>;
    }

    async function create(
      componentDefinition: ComponentDefinition,
    ): Promise<DataResponse<ComponentDefinition>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            decamelizeKeys(componentDefinition, { separator: '-' }),
          ),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ComponentDefinition>;
    }

    async function updateImportComponentDefinitions(
      id: string,
      importDefinitions: ImportComponentDefinition[],
    ): Promise<DataResponse<ComponentDefinition>> {
      const config = await configStore.getConfig();

      // Get current component definition to preserve existing metadata
      const currentResponse = await get(id);
      const componentDefinition = {
        uuid: id,
        metadata: currentResponse.data.metadata,
        importComponentDefinitions: importDefinitions,
      };

      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            decamelizeKeys(componentDefinition, { separator: '-' }),
          ),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ComponentDefinition>;
    }

    async function full(
      id: string,
    ): Promise<DataResponse<ComponentDefinition>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/full`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ComponentDefinition>;
    }

    async function getCharacteristics(
      id: string,
    ): Promise<DataResponse<ComponentDefinitionCharacteristics>> {
      const config = await configStore.getConfig();

      // Get all the main content sections like SSP does for characteristics
      const [importDefs, components, capabilities, backMatter] =
        await Promise.all([
          fetch(
            `${config.API_URL}/api/oscal/component-definitions/${id}/import-component-definitions`,
            {
              credentials: 'include',
            },
          ),
          fetch(
            `${config.API_URL}/api/oscal/component-definitions/${id}/components`,
            {
              credentials: 'include',
            },
          ),
          fetch(
            `${config.API_URL}/api/oscal/component-definitions/${id}/capabilities`,
            {
              credentials: 'include',
            },
          ),
          fetch(
            `${config.API_URL}/api/oscal/component-definitions/${id}/back-matter`,
            {
              credentials: 'include',
            },
          ),
        ]);

      const characteristics: ComponentDefinitionCharacteristics = {
        importComponentDefinitions: importDefs.ok
          ? (await importDefs.json()).data
          : [],
        components: components.ok ? (await components.json()).data : [],
        capabilities: capabilities.ok ? (await capabilities.json()).data : [],
        backMatter: backMatter.ok ? (await backMatter.json()).data : [],
      };

      return camelcaseKeys(
        { data: characteristics },
        { deep: true },
      ) as DataResponse<ComponentDefinitionCharacteristics>;
    }

    async function getImportComponentDefinitions(
      id: string,
    ): Promise<DataResponse<ImportComponentDefinition[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/import-component-definitions`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ImportComponentDefinition[]>;
    }

    async function getComponents(
      id: string,
    ): Promise<DataResponse<DefinedComponent[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/components`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<DefinedComponent[]>;
    }

    async function getDefinedComponent(
      id: string,
      componentId: string,
    ): Promise<DataResponse<DefinedComponent>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/components/${componentId}`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<DefinedComponent>;
    }

    async function getControlImplementations(
      id: string,
      componentId: string,
    ): Promise<DataResponse<ComponentDefinitionControlImplementation[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/components/${componentId}/control-implementations`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ComponentDefinitionControlImplementation[]>;
    }

    async function getCapabilities(
      id: string,
    ): Promise<DataResponse<Capability[]>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/capabilities`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Capability[]>;
    }

    async function getBackMatter(id: string): Promise<DataResponse<any>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/back-matter`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<any>;
    }

    async function createBackMatterResource(
      id: string,
      resource: BackMatterResource,
    ): Promise<DataResponse<BackMatterResource>> {
      const config = await configStore.getConfig();
      const payload = {
        resources: [decamelizeKeys(resource, { separator: '-' })],
      };
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/back-matter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const result = camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<any>;
      // Return the first resource from the response
      return {
        data: result.data.resources[0],
      } as DataResponse<BackMatterResource>;
    }

    async function createComponent(
      id: string,
      component: DefinedComponent,
    ): Promise<DataResponse<DefinedComponent>> {
      const config = await configStore.getConfig();
      const payload = [decamelizeKeys(component, { separator: '-' })];
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/components`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const result = camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<DefinedComponent[]>;
      // Return the first component from the array response
      return { data: result.data[0] } as DataResponse<DefinedComponent>;
    }

    async function createCapability(
      id: string,
      capability: Capability,
    ): Promise<DataResponse<Capability>> {
      const config = await configStore.getConfig();
      const payload = decamelizeKeys(capability, { separator: '-' });
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/capability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const result = camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Capability[]>;
      // Return the first capability from the array response
      return { data: result.data[0] } as DataResponse<Capability>;
    }

    async function updateComponents(
      id: string,
      components: DefinedComponent[],
    ): Promise<DataResponse<DefinedComponent[]>> {
      const config = await configStore.getConfig();
      const payload = decamelizeKeys(components, { separator: '-' });
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/components`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<DefinedComponent[]>;
    }

    async function updateComponent(
      id: string,
      componentId: string,
      component: DefinedComponent,
    ): Promise<DataResponse<DefinedComponent>> {
      // For single component updates, we'll use the bulk endpoint with a single item array
      const response = await updateComponents(id, [component]);
      return { data: response.data[0] } as DataResponse<DefinedComponent>;
    }

    async function updateCapability(
      id: string,
      capabilityId: string,
      capability: Capability,
    ): Promise<DataResponse<Capability>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/capabilities/${capabilityId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(capability, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Capability>;
    }

    async function getCapability(
      id: string,
      capabilityId: string,
    ): Promise<DataResponse<Capability>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/capabilities/${capabilityId}`,
        {
          credentials: 'include',
        },
      );
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<Capability>;
    }

    async function createImportComponentDefinition(
      id: string,
      importDef: ImportComponentDefinition,
    ): Promise<DataResponse<ImportComponentDefinition>> {
      const config = await configStore.getConfig();
      const response = await fetch(
        `${config.API_URL}/api/oscal/component-definitions/${id}/import-component-definitions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(decamelizeKeys(importDef, { separator: '-' })),
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return camelcaseKeys(await response.json(), {
        deep: true,
      }) as DataResponse<ImportComponentDefinition>;
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
      createBackMatterResource,
    };
  },
);
