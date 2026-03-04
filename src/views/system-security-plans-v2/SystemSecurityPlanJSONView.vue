<template>
  <div class="space-y-6">
    <V2PageHeader eyebrow="JSON" title="Full System Security Plan JSON" />

    <section
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
          View, download, or copy the complete SSP document payload.
        </p>
        <div class="flex gap-2">
          <button
            class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            type="button"
            @click="downloadJSON"
          >
            Download JSON
          </button>
          <button
            class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-4 py-2 text-[var(--ui-v2-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            type="button"
            @click="copyToClipboard"
          >
            Copy JSON
          </button>
        </div>
      </div>

      <V2StatePanel
        v-if="loading"
        kind="loading"
        title="Loading"
        description="Loading full system security plan..."
      />

      <V2StatePanel
        v-else-if="error"
        kind="error"
        title="Load failed"
        :description="error"
      >
        <template #actions>
          <button
            type="button"
            class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
            @click="loadSystemSecurityPlan"
          >
            Retry
          </button>
        </template>
      </V2StatePanel>

      <V2StatePanel
        v-else-if="!sspData"
        kind="empty"
        title="No JSON payload"
        description="No full JSON payload is available for this system security plan."
      />

      <div
        v-else
        class="overflow-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)]"
      >
        <pre
          class="max-h-[560px] p-4 text-[13px] leading-6 text-[var(--ui-v2-foreground)]"
        ><code>{{ formattedJSON }}</code></pre>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfigStore } from '@/stores/config';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

const route = useRoute();
const configStore = useConfigStore();
const toast = useToast();

const sspId = ref<string>(String(route.params.id || ''));
const sspData = ref<unknown>(null);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);

const formattedJSON = computed(() => {
  if (!sspData.value) return '';
  return JSON.stringify(sspData.value, null, 2);
});

watch(
  () => route.params.id,
  async (id) => {
    sspId.value = String(id || '');
    await loadSystemSecurityPlan();
  },
);

onMounted(async () => {
  await loadSystemSecurityPlan();
});

async function loadSystemSecurityPlan() {
  if (!sspId.value) {
    loading.value = false;
    error.value = 'No SSP id provided.';
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/system-security-plans/${sspId.value}/full`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    sspData.value = await response.json();
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to load system security plan JSON.';

    error.value = message;
    toast.add({
      severity: 'error',
      summary: 'Error Loading JSON',
      detail: message,
      life: 3000,
    });
  } finally {
    loading.value = false;
  }
}

async function downloadJSON() {
  if (!sspData.value) return;

  try {
    const jsonData = JSON.stringify(sspData.value, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-security-plan-${sspId.value}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.add({
      severity: 'success',
      summary: 'JSON Downloaded',
      detail: 'System security plan JSON downloaded successfully.',
      life: 2500,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail:
        err instanceof Error
          ? err.message
          : 'Failed to download system security plan JSON.',
      life: 3000,
    });
  }
}

async function copyToClipboard() {
  if (!sspData.value) return;

  try {
    const jsonData = JSON.stringify(sspData.value, null, 2);
    await navigator.clipboard.writeText(jsonData);

    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'System security plan JSON copied to clipboard.',
      life: 2000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Copy Failed',
      detail:
        err instanceof Error
          ? err.message
          : 'Failed to copy JSON to clipboard.',
      life: 3000,
    });
  }
}
</script>
