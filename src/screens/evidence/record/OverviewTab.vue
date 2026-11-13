<script setup lang="ts">
import { computed } from 'vue';
import { subjectSource } from '@/types/subjects';
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import ItemList from '@/ds/components/ItemList/ItemList.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Text from '@/ds/components/Text/Text.vue';
import { canPlayBack, useEvidenceRecord } from './evidenceRecord';

/**
 * Overview: what the evidence says and why, the tasks behind it, and what it is about. Playback
 * of the policy evaluation is still on the classic page, linked from here when the agent stored
 * what playback needs.
 */
const { evidence } = useEvidenceRecord();
const item = computed(() => evidence.value!);

const current = computed(() => [
  {
    key: 'reason',
    label: 'Status reason',
    value: item.value.status?.reason || 'No reason given',
  },
  { key: 'tasks', label: 'Tasks', value: item.value.activities?.length ?? 0 },
]);

const tasks = computed(() =>
  (item.value.activities ?? []).map((activity) => ({
    id: activity.uuid,
    title: activity.title || 'Untitled task',
    meta: [
      activity.description,
      activity.steps?.length
        ? `Steps: ${activity.steps.map((s) => s.title || 'Untitled step').join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join(' · '),
  })),
);

/** Older APIs leave subjects out entirely; then there is no Subjects panel. */
const subjects = computed(() =>
  item.value.subjectReferences === undefined
    ? undefined
    : item.value.subjectReferences.map((ref) => ({
        id: ref.subjectUuid,
        title: ref.title || ref.subjectUuid,
        meta: [ref.type, subjectSource(ref)].filter(Boolean).join(' · '),
      })),
);

const playback = computed(() => canPlayBack(item.value.props));
</script>

<template>
  <Stack gap="6">
    <Panel title="Description">
      <Text v-if="item.description" variant="prose" preserve-whitespace>{{
        item.description
      }}</Text>
      <Text v-else variant="secondary">No description given.</Text>
    </Panel>

    <Panel title="Current state">
      <DescriptionList :items="current" />
    </Panel>

    <Panel title="Tasks">
      <ItemList
        :items="tasks"
        empty-text="No tasks are recorded for this evidence."
      />
    </Panel>

    <Panel v-if="subjects" title="Subjects">
      <ItemList
        :items="subjects"
        empty-text="This evidence doesn't name what it is about (unattributed)."
      />
    </Panel>

    <InlineMessage
      v-if="playback"
      tone="info"
      title="This evaluation can be played back"
    >
      <p>
        The agent stored the policy and input it evaluated. Playback is on the
        classic page for now.
      </p>
      <template #actions>
        <Button
          size="sm"
          icon="external"
          :to="{ name: 'evidence:view', params: { id: item.id } }"
          >Open playback</Button
        >
      </template>
    </InlineMessage>
  </Stack>
</template>
