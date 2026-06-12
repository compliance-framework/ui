<script setup lang="ts">
import type { Statement } from '@/oscal';
import TooltipTitle from '@/components/TooltipTitle.vue';
import Button from '@/volt/Button.vue';

defineProps<{
  statement: Statement;
}>();

const emit = defineEmits<{
  edit: [];
}>();
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
    <div>
      <TooltipTitle
        text="Statement ID"
        tooltip-key="statement.id"
        underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
      />
      <p class="text-sm">{{ statement.statementId }}</p>
    </div>
    <div>
      <TooltipTitle
        text="Remarks"
        tooltip-key="statement.remarks"
        underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
      />
      <p class="text-sm">{{ statement.remarks || 'None' }}</p>
    </div>
    <div>
      <TooltipTitle
        text="Description"
        tooltip-key="statement.description"
        underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
      />
      <p class="text-sm">{{ statement.description || 'None' }}</p>
    </div>
    <div>
      <TooltipTitle
        text="Props"
        tooltip-key="statement.props"
        underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
      />
      <p class="text-sm">{{ statement.props || 'None' }}</p>
    </div>
    <div>
      <TooltipTitle
        text="Links"
        tooltip-key="statement.links"
        underline-class="text-sm font-medium text-gray-500 underline decoration-dotted cursor-help"
      />
      <p class="text-sm">{{ statement.links || 'None' }}</p>
    </div>
  </div>

  <div class="flex items-center mb-4 gap-x-4">
    <Button
      label="Edit Statement"
      class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      @click="emit('edit')"
    />
  </div>
</template>
