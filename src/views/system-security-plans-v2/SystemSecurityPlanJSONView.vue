<template>
  <section
    v-if="loading"
    class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-5 py-6 text-center"
  >
    <p
      class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
    >
      Loading SSP JSON content...
    </p>
    <p
      class="font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold uppercase tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
    >
      Fetching full system security plan data.
    </p>
  </section>

  <section
    v-else-if="error"
    class="flex flex-col items-center justify-center gap-2 border border-[#d20f3940] bg-[#d20f3915] px-5 py-6 text-center"
  >
    <p
      class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-error)]"
    >
      Unable to load SSP JSON content.
    </p>
    <p
      class="font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold uppercase tracking-[1px] text-[#b52134]"
    >
      Check API availability and retry.
    </p>
  </section>

  <V2StatePanel
    v-else-if="!hasPayload"
    kind="empty"
    title="No JSON payload"
    description="No full JSON payload is available for this system security plan."
  />

  <section
    v-else
    class="flex flex-col gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
  >
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h2
        class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
      >
        FULL SYSTEM SECURITY PLAN JSON
      </h2>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-[10px] font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] text-[var(--ui-v2-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="downloadJSON"
        >
          DOWNLOAD JSON
        </button>

        <button
          type="button"
          class="inline-flex h-8 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-[10px] font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          @click="copyToClipboard"
        >
          COPY JSON
        </button>
      </div>
    </header>

    <p
      class="font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
    >
      Raw API response from /api/oscal/system-security-plans/{id}/full
    </p>

    <div
      class="h-[360px] overflow-auto border border-[#4c4f69] bg-[#303446] p-3"
    >
      <pre
        class="m-0 whitespace-pre font-[var(--ui-v2-font-secondary)] text-[12px] font-medium leading-[1.55] text-[#e6e9ef]"
      ><code>{{ formattedJSON }}</code></pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfigStore } from '@/stores/config';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

const route = useRoute();
const configStore = useConfigStore();
const toast = useToast();

const sspId = ref<string>(String(route.params.id || ''));
const rawResponse = ref<unknown | null>(null);
const loading = ref<boolean>(true);
const error = ref<string | null>(null);

const hasPayload = computed(() => rawResponse.value !== null);

const formattedJSON = computed(() => {
  if (rawResponse.value === null) {
    return '';
  }

  return JSON.stringify(rawResponse.value, null, 2);
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
    rawResponse.value = null;
    loading.value = false;
    error.value = 'No SSP id provided.';
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    rawResponse.value = null;

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

    rawResponse.value = await response.json();
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to load system security plan JSON.';

    error.value = message;
    rawResponse.value = null;
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
  if (!hasPayload.value) {
    return;
  }

  try {
    const jsonData = formattedJSON.value;
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
  if (!hasPayload.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(formattedJSON.value);

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
