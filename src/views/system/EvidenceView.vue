<template>
  <NoActiveSystem v-if="!sspId" subject="evidence" />
  <template v-else>
    <Message v-if="scopeError" severity="error" class="mt-4">
      {{ scopeError }}
    </Message>
    <template v-else-if="scope">
      <div v-if="scope.entries.length === 0" data-testid="empty-scope">
        <PageHeader>Evidence</PageHeader>
        <div
          class="mx-auto mt-8 max-w-2xl rounded-lg border border-dashed border-ccf-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"
        >
          <h3 class="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Define this system's scope
          </h3>
          <p class="mt-2 text-gray-600 dark:text-slate-400">
            This system has not declared which evidence belongs to it yet. Add
            the labels that identify its evidence on the Scope tab.
          </p>
          <div class="mt-6 flex justify-center">
            <RouterLinkButton :to="{ name: 'system:scope' }">
              Define the scope
            </RouterLinkButton>
          </div>
        </div>
      </div>
      <EvidenceIndexView
        v-else
        :search-endpoint="`${base}/evidence/search`"
        :status-over-time-endpoint="`${base}/evidence/status-over-time`"
        :ssp-id="sspId"
      />
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import NoActiveSystem from '@/components/system/NoActiveSystem.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import Message from '@/volt/Message.vue';
import EvidenceIndexView from '@/views/evidence/IndexView.vue';
import { useActiveSspId } from '@/composables/useActiveSspId';
import { useSspScope } from '@/composables/useSspScope';
import { getErrorDetail } from '@/utils/httpErrors';

// This System > Evidence: the active system's in-scope evidence, through the SSP's scoped
// search endpoints. The layout remounts this page when the active system changes, so the
// scope is read once. An empty scope means the system has not declared its evidence yet
// (not "everything"), so the page asks for a scope instead of listing nothing.
const sspId = useActiveSspId();
const base = computed(() => `/api/oscal/system-security-plans/${sspId.value}`);
const { scope, load } = useSspScope(sspId);
const scopeError = ref('');

if (sspId.value) {
  load().catch(async (error) => {
    scopeError.value = await getErrorDetail(
      error,
      "Failed to load this system's scope.",
    );
  });
}
</script>
