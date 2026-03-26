<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-4">POAM Items</h1>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      <div>
        <label class="block text-sm font-medium mb-1">Status</label>
        <select v-model="status" class="border rounded px-2 py-1 w-full">
          <option value="">Any</option>
          <option value="open">open</option>
          <option value="in-progress">in-progress</option>
          <option value="completed">completed</option>
          <option value="overdue">overdue</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">SSP ID</label>
        <input
          v-model="sspId"
          placeholder="UUID"
          class="border rounded px-2 py-1 w-full"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Risk ID</label>
        <input
          v-model="riskId"
          placeholder="UUID"
          class="border rounded px-2 py-1 w-full"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Deadline Before</label>
        <input
          v-model="deadlineBefore"
          placeholder="YYYY-MM-DDTHH:mm:ssZ"
          class="border rounded px-2 py-1 w-full"
        />
      </div>
    </div>
    <div class="mb-4">
      <button @click="refresh" class="bg-blue-600 text-white px-3 py-1 rounded">
        Apply Filters
      </button>
    </div>
    <div v-if="loading" class="text-gray-600">Loading...</div>
    <div v-else-if="error" class="text-red-600">Failed to load POAM items</div>
    <table v-else class="min-w-full border rounded">
      <thead>
        <tr class="bg-gray-100 text-left text-sm">
          <th class="p-2 border">Title</th>
          <th class="p-2 border">Status</th>
          <th class="p-2 border">Deadline</th>
          <th class="p-2 border">Owner</th>
          <th class="p-2 border">Updated</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id" class="text-sm">
          <td class="p-2 border">{{ item.title }}</td>
          <td class="p-2 border">{{ item.status }}</td>
          <td class="p-2 border">{{ item.deadline ?? '-' }}</td>
          <td class="p-2 border">
            {{ item.primaryOwnerUserId ?? '-' }}
          </td>
          <td class="p-2 border">{{ item.updatedAt }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed } from 'vue';
import { useApi } from '@/composables/api';

type PoamItem = {
  id: string;
  sspId: string;
  title: string;
  description: string;
  status: string;
  deadline?: string | null;
  resourceRequired?: string | null;
  primaryOwnerUserId?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { data: PoamItem[] };

const status = ref<string>('');
const sspId = ref<string>('');
const riskId = ref<string>('');
const deadlineBefore = ref<string>('');

const url = () => {
  const params = new URLSearchParams();
  if (status.value) params.set('status', status.value);
  if (sspId.value) params.set('sspId', sspId.value);
  if (riskId.value) params.set('riskId', riskId.value);
  if (deadlineBefore.value) params.set('deadlineBefore', deadlineBefore.value);
  const qs = params.toString();
  return new Request(`/api/poam-items${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: new Headers(),
  });
};

const data = ref<ListResponse>();
const loading = ref<boolean>(true);
const error = ref<boolean>(false);

function load() {
  loading.value = true;
  error.value = false;
  const { data: d, loading: l, error: e } = useApi<ListResponse>(url());
  watchEffect(() => {
    data.value = d.value;
    loading.value = l.value;
    error.value = e.value;
  });
}

function refresh() {
  load();
}

load();

const items = computed(() => data.value?.data ?? []);
</script>

<style scoped></style>
