<template>
  <table class="table-auto w-full rounded-full dark:text-slate-300">
    <tbody>
    <tr
      class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
      v-for="item in evidence"
      :key="item.uuid"
    >
      <td class="py-2 pl-4 pr-2 w-[1%]">
        <ResultStatusRing
          class="p-0 m-0 whitespace-normal"
          :state="item.status.state?.toLowerCase()"
        ></ResultStatusRing>
      </td>
      <td class="py-3 px-2 whitespace-nowrap grow">{{ item.title }}</td>
      <td class="px-2" v-if="configStore.showLabels">
        <div class="h-full flex items-center">
          <button v-tooltip.top="'Show hidden labels'" type="button" class="cursor-pointer mr-2" @click="toggle($event, item.labels)"><BIconEye /></button>
          <LabelList :show-all="configStore.showHiddenLabels" :labels="item.labels" />
        </div>
      </td>
      <td class="py-2 px-2 text-right whitespace-nowrap">
        <RouterLink
          class="mr-2 bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 border-ccf-300 dark:border-slate-700"
          :to="{ name: 'evidence:history', params: { uuid: item.uuid } }"
        >History
        </RouterLink>
        <RouterLink
          class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 border-ccf-300 dark:border-slate-700"
          :to="{ name: 'evidence:view', params: { id: item.id } }"
        >View
        </RouterLink>
      </td>
    </tr>
    </tbody>
  </table>
  <Popover ref="op" class=" max-w-[40rem]">
    <div class="flex gap-2 items-center flex-wrap">
      <Chip
        class="mx-0.5 text-sm"
        v-for="(label) in popoverLabels"
        :key="label"
        :label="label"
      />
    </div>
  </Popover>
</template>
<script setup lang="ts">
import LabelList from '@/components/LabelList.vue'
import ResultStatusRing from '@/components/ResultStatusRing.vue'
import { useConfigStore } from '@/stores/config.ts'
import Popover from '@/volt/Popover.vue';
import { ref } from 'vue'
import type { EvidenceLabel } from '@/stores/evidence.ts'
import Chip from '@/volt/Chip.vue'
import { BIconEye } from 'bootstrap-icons-vue'

defineProps(['evidence'])
const popoverLabels = ref<string[]>([]);
const op = ref();

const configStore = useConfigStore();

function toggle(event, labels) {
  popoverLabels.value = labels.map((label:EvidenceLabel) => `${label.name}=${label.value}`);
  op.value.toggle(event);
};
</script>
