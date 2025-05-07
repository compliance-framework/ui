<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Components</h1>
    <div v-if="components.length" class="space-y-4">
      <div v-for="component in components" :key="component.id" class="border rounded-md p-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">{{ component.name }}</h2>
          <button
            @click="toggleComponent(component.id)"
            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            {{ expandedComponent === component.id ? 'Hide Results' : 'Show Results' }}
          </button>
        </div>
        <div v-if="expandedComponent === component.id" class="mt-4">
          <ul>
            <li v-for="finding in componentFindings[component.id]" :key="finding.id" class="mb-2">
              <div class="p-2 border rounded-md">
                <p><strong>ID:</strong> {{ finding.id }}</p>
                <p><strong>Title:</strong> {{ finding.title }}</p>
                <p><strong>Description:</strong> {{ finding.description }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else>
      <p>No components found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConfigStore } from '@/stores/config.ts';

interface Component {
  id: string;
  name: string;
}

interface Finding {
  id: string;
  title: string;
  description: string;
}

const components = ref<Component[]>([]);
const componentFindings = ref<Record<string, Finding[]>>({});
const expandedComponent = ref<string | null>(null);
const configStore = useConfigStore();

function toggleComponent(componentId: string) {
  if (expandedComponent.value === componentId) {
    expandedComponent.value = null;
  } else {
    expandedComponent.value = componentId;
    if (!componentFindings.value[componentId]) {
      fetchFindingsByComponent(componentId);
    }
  }
}

async function fetchComponents() {
  const config = await configStore.getConfig();
  const response = await fetch(`${config.API_URL}/api/findings/components/ids`);
  const data = await response.json();
  components.value = data.data.map((component: { id: string; name: string }) => ({
    id: component.id,
    name: component.name,
  }));
}

function decodeComponentId(encodedId: string): string {
  const binary = atob(encodedId);
  return Array.from(new Uint8Array(binary.split('').map(char => char.charCodeAt(0))))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchFindingsByComponent(componentId: string) {
  const decodedId = decodeComponentId(componentId);
  const config = await configStore.getConfig();
  const response = await fetch(`${config.API_URL}/api/findings/by-component/${decodedId}`);
  const data = await response.json();
  componentFindings.value[componentId] = data.data.map((finding: any) => ({
    id: finding.id,
    title: finding.title,
    description: finding.description,
  }));
}

onMounted(() => {
  fetchComponents();
});
</script>

<style scoped>
/* Add any necessary styles here */
</style>