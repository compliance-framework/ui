<script setup lang="ts">
/**
 * Reassign a step to someone else: the person (from the selectable-users list, filtered as you
 * type) and an optional reason. Loads the people when it opens. Emits `submit`; the step panel
 * saves and reports any error back through `error`.
 */
import { computed, ref } from 'vue';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

defineProps<{ error?: string; processing?: boolean }>();
const emit = defineEmits<{
  submit: [payload: { userId: string; reason: string }];
  cancel: [];
}>();

const users =
  useApiQuery<{ id: string; displayName: string }[]>('/api/users/select');
const userOptions = computed(() =>
  (users.data.value ?? []).map((u) => ({
    value: u.id,
    label: u.displayName || u.id,
  })),
);

const chosen = ref('');
const reason = ref('');

function submit() {
  emit('submit', { userId: chosen.value, reason: reason.value });
}
</script>

<template>
  <form id="reassign-form" novalidate @submit.prevent="submit">
    <Stack gap="4">
      <FormField label="Assign to" required>
        <Combobox
          v-model="chosen"
          :options="userOptions"
          :loading="users.status.value === 'loading'"
          placeholder="Type a name"
          empty-text="No one matches."
        />
      </FormField>
      <InlineMessage
        v-if="users.status.value === 'error'"
        tone="error"
        title="People didn't load"
      >
        <p>Close this and try again.</p>
      </InlineMessage>
      <FormField label="Reason" hint="Optional: context for the new assignee.">
        <Textarea v-model="reason" :rows="3" />
      </FormField>
      <InlineMessage v-if="error" tone="error" title="Not reassigned">
        <p>{{ error }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          icon="person"
          :loading="processing"
          >Reassign</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
