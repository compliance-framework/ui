<script setup lang="ts">
/**
 * Demo feedback: on the public demo only (when DEMO_FEEDBACK_URL is set), a floating Feedback
 * button opens a dialog that posts the message, with the page it came from, to the demo portal.
 */
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { useConfigStore } from '@/stores/config';
import Button from '@/ds/components/Button/Button.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FloatingButton from '@/ds/components/FloatingButton/FloatingButton.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

// The portal works out who sent the feedback from its LinkedIn session cookie, so the request
// carries credentials, and posts it to Slack.
const MAX_LENGTH = 4000;

const toast = useToast();
const configStore = useConfigStore();

const feedbackUrl = ref('');
const visible = ref(false);
const message = ref('');
const sending = ref(false);
const error = ref('');

const tooLong = computed(() => message.value.length > MAX_LENGTH);
const sendDisabledReason = computed(() => {
  if (!message.value.trim()) return 'Write your feedback first.';
  if (tooLong.value) return `Keep it under ${MAX_LENGTH} characters.`;
  return undefined;
});

onMounted(async () => {
  try {
    feedbackUrl.value = (await configStore.getConfig()).DEMO_FEEDBACK_URL ?? '';
  } catch {
    feedbackUrl.value = '';
  }
});

function open() {
  error.value = '';
  visible.value = true;
}

async function send() {
  if (sendDisabledReason.value || sending.value) return;
  sending.value = true;
  error.value = '';
  try {
    const response = await fetch(feedbackUrl.value, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.value,
        page: window.location.href,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      error.value = body.error ?? 'Your feedback wasn’t sent. Try again.';
      return;
    }
    message.value = '';
    visible.value = false;
    toast.add({
      severity: 'success',
      summary: 'Thank you',
      detail: 'Your feedback has been sent to the CCF team.',
      life: 4000,
    });
  } catch {
    error.value = 'Your feedback wasn’t sent. Try again.';
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <template v-if="feedbackUrl">
    <FloatingButton
      label="Feedback"
      icon="share"
      data-testid="demo-feedback-button"
      @click="open"
    />
    <Dialog v-model:open="visible" title="Send feedback" size="s">
      <form novalidate @submit.prevent="send">
        <Stack gap="4">
          <Text
            >Tell the CCF team what you think, what's confusing or what you'd
            like to see. We'll see your LinkedIn name and email with it.</Text
          >
          <FormField label="Feedback">
            <Textarea
              v-model="message"
              :rows="6"
              :maxlength="MAX_LENGTH"
              data-testid="demo-feedback-message"
            />
          </FormField>
          <InlineMessage v-if="error" tone="error" title="Not sent">
            <p data-testid="demo-feedback-error">{{ error }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="visible = false">Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              :loading="sending"
              :disabled-reason="sendDisabledReason"
              data-testid="demo-feedback-send"
              >Send</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Dialog>
  </template>
</template>
