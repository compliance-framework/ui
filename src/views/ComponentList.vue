<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Components</h1>
    <div v-if="components.length" class="space-y-4">
      <div v-for="component in components" :key="component.id" class="border rounded-md p-4">
        <CollapsableGroup>
          <template #header>
            <div class="flex items-center px-4 gap-4">
              <div class="py-3">
                <ResultStatusBadge
                  :gray="
                    componentFindings.findings.reduce(
                      (total, current) =>
                        ['satisfied', 'not satisfied'].includes(
                          (current.status?.state || '').toLowerCase(),
                        )
                          ? total
                          : total + 1,
                      0,
                    )
                  "
                  :red="
                    componentFindings.findings.reduce(
                      (total, current) =>
                        current.status?.state.toLowerCase() == 'not satisfied'
                          ? total + 1
                          : total,
                      0,
                    )
                  "
                  :green="
                    componentFindings.findings.reduce(
                      (total, current) =>
                        current.status?.state.toLowerCase() == 'satisfied'
                          ? total + 1
                          : total,
                      0,
                    )
                  "
                ></ResultStatusBadge>
              </div>
              <!-- <div class="w-1/4 py-1">{{ components[components.]?.title }}</div> -->
              <div class="flex-1 ml-4" v-if="configStore.showLabels">
                <!-- <LabelList :labels="subjects[subject.subject]?.attributes || {}" :exclude-keys="['instance-name', 'image-id']" /> -->
              </div>
            </div>
          </template>
        <div class="px-4">
          <!-- <FindingsList :findings="subject.findings" /> -->
        </div>
      </CollapsableGroup>
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
  status?: {
    state: string;
  };
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