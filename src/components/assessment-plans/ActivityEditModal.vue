<template>
  <Modal :show="show" @close="show = false">
    <div class="px-12 py-8">
      <ActivityEditForm @updated="done" @cancel="show = false" :assessment-plan-id="assessmentPlanId" :activity="activity" />
    </div>
    <div class="border-t border-t-ccf-300 dark:border-slate-700 text-right py-4 px-4">
      <PrimaryButton
        @click="show = false"
        class="px-2 py-1 border-ccf-300 dark:border-slate-700 border rounded-md shadow"
      >
        Close
      </PrimaryButton>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue'
import Modal from '@/components/Modal.vue'
import ActivityEditForm from '@/components/assessment-plans/ActivityEditForm.vue'
import type { Activity } from '@/stores/activities.ts'

const show = defineModel<boolean>()

const emit = defineEmits({
  updated(activity: Activity) {
    return !!activity.uuid
  }
})

const props = defineProps<{
  assessmentPlanId: string
  activity: Activity
}>()

function done(activity: Activity) {
  show.value = false
  emit('updated', activity)
}
</script>
