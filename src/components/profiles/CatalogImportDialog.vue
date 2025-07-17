<template>
  <Dialog v-model:visible="localVisible" modal header="Add Catalog">
    <table class="table-fixed">
      <thead class="bg-ccf-100 dark:bg-slate-800 text-ccf-700 dark:text-slate-200">
        <tr>
          <th class="p-2">Catalog Name</th>
          <th class="p-2">Catalog UUID</th>
          <th class="p-2">Actions</th>
        </tr>
      </thead>
      <tbody v-if="loading">
      <tr>
        <td class="py-2 pr-3 font-medium text-wrap">Loading ...</td>
      </tr>
      </tbody>
      <tbody v-else>
        <tr v-for="catalog in catalogs" :key="catalog.uuid">
          <td class="py-2 pr-3 font-medium text-wrap">{{ catalog.metadata.title }}</td>
          <td class="py-2 pr-3">
            <pre>{{ catalog.uuid }}</pre>
          </td>
          <td class="py-2 pr-3">
            <PrimaryButton
              :disabled="!!importedCatalogs[catalog.uuid]"
              @click="$emit('import', catalog)"
              class="disabled:text-ccf-600 disabled:bg-ccf-200 dark:disabled:bg-slate-700"
              v-tooltip.top="{ value: 'Catalog is already imported in this profile', disabled: !importedCatalogs[catalog.uuid] }"
            >Import</PrimaryButton>
          </td>
        </tr>
      </tbody>
    </table>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import type { Catalog } from '@/stores/catalogs';
import { ref, watch } from 'vue';
import { useDataApi } from '@/composables/useApi'

const { data: catalogs, loading } = useDataApi<Catalog[]>(new Request("/api/oscal/catalogs"))

const props = defineProps<{
  visible: boolean;
  importedCatalogs: Record<string, string>;
}>();

const emit = defineEmits(['update:visible', 'import']);

const localVisible = ref(props.visible);

watch(() => props.visible, (val) => {
  localVisible.value = val;
});

watch(localVisible, (val) => {
  if (val !== props.visible) {
    emit('update:visible', val);
  }
});
</script>
