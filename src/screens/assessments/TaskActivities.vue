<script setup lang="ts">
/** A task's activities, each with its steps in order, on an assessment plan's Tasks tab. */
import { ref, watch } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Activity, AssociatedActivity } from '@/oscal';
import { useApiQuery } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import Text from '@/ds/components/Text/Text.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ planId: string; taskId: string }>();
const api = useAuthenticatedInstance();

const associated = useApiQuery<AssociatedActivity[]>(
  `/api/oscal/assessment-plans/${props.planId}/tasks/${props.taskId}/associated-activities`,
  { isEmpty: (list) => list.length === 0 },
);

/** Activities by UUID, loaded one by one; a missing one shows by its UUID. */
const activities = ref<Record<string, Activity | null>>({});
watch(
  () => associated.data.value,
  (list) => {
    for (const { activityUuid } of list ?? []) {
      if (activityUuid in activities.value) continue;
      activities.value[activityUuid] = null;
      api
        .get<{ data: Activity }>(`/api/oscal/activities/${activityUuid}`)
        .then(
          (response) => (activities.value[activityUuid] = response.data.data),
        )
        .catch(() => undefined);
    }
  },
  { immediate: true },
);
</script>

<template>
  <Stack gap="2">
    <Text variant="label">Activities</Text>
    <DataState
      :status="associated.status.value"
      subject="activities"
      empty-title="No activities yet"
      empty-body="Activities are the steps an assessor follows for this task."
      skeleton="text"
      @retry="associated.retry"
    >
      <Stack gap="3">
        <Panel
          v-for="{ activityUuid } in associated.data.value"
          :key="activityUuid"
          :title="activities[activityUuid]?.title || activityUuid"
          :description="activities[activityUuid]?.description"
          :level="3"
        >
          <Stack v-if="activities[activityUuid]?.steps?.length" gap="2" as="ol">
            <li
              v-for="(step, index) in activities[activityUuid]!.steps"
              :key="step.uuid ?? index"
            >
              <Text as="span" variant="label">{{
                step.title || `Step ${index + 1}`
              }}</Text>
              <Text v-if="step.description" variant="secondary">{{
                step.description
              }}</Text>
            </li>
          </Stack>
          <Text v-else variant="secondary">No steps.</Text>
        </Panel>
      </Stack>
    </DataState>
  </Stack>
</template>
