<script setup lang="ts">
import type { Control } from '@/oscal'
import type { ImplementedRequirement } from '@/stores/system-security-plans.ts'
import PartDisplayEditor from '@/components/PartDisplayEditor.vue'
import PartDisplay from '@/components/PartDisplay.vue'

const props = defineProps<{
  control: Control,
  implementation: ImplementedRequirement | undefined | null,
}>()
</script>

<template>
  <div class="border-l-8 dark:border-l-slate-700 dark:bg-slate-800 px-4 py-2 rounded-xl">
    <PartDisplay v-for="part in control.parts?.filter(part => part.name == 'statement') || []" :key="part.id" :part="part" :level="0">
      <template #default="{ part }">
        <p>
        {{ part.id}}
        </p>
      </template>
    </PartDisplay>
<!--    <PartDisplayEditor v-for="part in control.parts?.filter(part => part.name == 'statement') || []" :key="part.id" :part="part"></PartDisplayEditor>-->
  </div>
  {{ implementation }}
</template>

<style scoped>

</style>
