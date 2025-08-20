<template>
  <Dialog v-model:visible="show" modal>
    <div class="px-12 py-8">
      <AssetCreateForm
        @created="done"
        @cancel="show = false"
        :assessment-plan-id="assessmentPlanId"
      />
    </div>
    <div
      class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4"
    >
      <PrimaryButton
        @click="show = false"
        class="px-2 py-1 border-ccf-300 dark:border-slate-700 border rounded-md shadow"
      >
        Close
      </PrimaryButton>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import AssetCreateForm from '@/components/assessment-plans/AssetCreateForm.vue';
import type { AssessmentAsset } from '@/stores/assessment-plans.ts';

const show = defineModel<boolean>();

const emit = defineEmits({
  created(asset: AssessmentAsset) {
    return !!asset.uuid;
  },
});

const props = defineProps<{
  assessmentPlanId: string;
}>();

function done(asset: AssessmentAsset) {
  show.value = false;
  emit('created', asset);
}
</script>
