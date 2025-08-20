<template>
  <Dialog v-model:visible="show" modal>
    <div class="px-12 py-8">
      <AssetEditForm @updated="done" @cancel="show = false" :assessment-plan-id="assessmentPlanId" :asset="asset" />
    </div>
    <div class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4">
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
import PrimaryButton from '@/components/PrimaryButton.vue'
import Dialog from '@/volt/Dialog.vue';
import AssetEditForm from '@/components/assessment-plans/AssetEditForm.vue'
import type { AssessmentAsset } from '@/stores/assessment-plans.ts'

const show = defineModel<boolean>()

const emit = defineEmits({
  updated(asset: AssessmentAsset) {
    return !!asset.uuid
  }
})

const props = defineProps<{
  assessmentPlanId: string
  asset: AssessmentAsset
}>()

function done(asset: AssessmentAsset) {
  show.value = false
  emit('updated', asset)
}
</script>
