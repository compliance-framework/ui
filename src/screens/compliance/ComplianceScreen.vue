<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { ProfileComplianceProgress } from '@/types/compliance';
import type { DataResponse } from '@/stores/types';
import { useSystemStore } from '@/stores/system';
import { getErrorStatus } from '@/utils/httpErrors';
import type { QueryStatus } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Select from '@/ds/components/Select/Select.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import ComplianceProgressView from './ComplianceProgressView.vue';
import { readView, viewQuery, type ComplianceView } from './complianceView';

/**
 * This System > Compliance: how the system measures up against an attached profile. Totals,
 * overall and per-group breakdowns, implementation coverage, and every control with its status
 * and evidence. Each total filters the controls below it; with several profiles attached, the
 * profile is chosen above. Profile, filter and search live in the URL.
 */
const route = useRoute();
const router = useRouter();
const api = useAuthenticatedInstance();
const systemStore = useSystemStore();

const systemId = String(route.params.systemId);
const systemName = computed(
  () => systemStore.system.securityPlan?.metadata.title ?? 'this system',
);
const view = computed(() => readView(route.query));

function withView(next: ComplianceView): LocationQueryRaw {
  const query: LocationQueryRaw = { ...route.query };
  for (const key of ['profile', 'status', 'q']) delete query[key];
  return { ...query, ...viewQuery(next) };
}
function go(patch: Partial<ComplianceView>): void {
  void router.push({ query: withView({ ...view.value, ...patch }) });
}

// Profiles and progress ------------------------------------------------------------------------

const profiles = ref<{ uuid: string; title: string }[]>([]);
const status = ref<QueryStatus | 'no-profile'>('loading');
const progress = ref<ProfileComplianceProgress>();

const profileId = computed(
  () =>
    profiles.value.find((p) => p.uuid === view.value.profile)?.uuid ??
    profiles.value[0]?.uuid,
);

async function loadProfiles(): Promise<void> {
  status.value = 'loading';
  try {
    // The API names the profile `id`; older builds used `uuid`.
    const response = await api.get<
      DataResponse<{ id?: string; uuid?: string; title?: string }[]>
    >(`/api/oscal/system-security-plans/${systemId}/profiles`);
    profiles.value = (response.data.data ?? [])
      .map((p) => ({
        uuid: p.id ?? p.uuid ?? '',
        title: p.title || 'Untitled profile',
      }))
      .filter((p) => p.uuid);
    if (!profiles.value.length) status.value = 'no-profile';
  } catch (error) {
    // No profiles attached reads as a 404 on some API versions.
    if (getErrorStatus(error) === 404) status.value = 'no-profile';
    else status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}

let latest = 0;
async function loadProgress(id: string): Promise<void> {
  const request = ++latest;
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<ProfileComplianceProgress>>(
      `/api/oscal/profiles/${id}/compliance-progress`,
      { params: { includeControls: true, sspId: systemId } },
    );
    if (request !== latest) return;
    progress.value = response.data.data;
    status.value = 'ready';
  } catch (error) {
    if (request !== latest) return;
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}

async function load(): Promise<void> {
  await loadProfiles();
  if (profileId.value) await loadProgress(profileId.value);
}
void load();
watch(profileId, (id, previous) => {
  if (id && previous && id !== previous) void loadProgress(id);
});

const profileOptions = computed(() =>
  profiles.value.map((p) => ({ value: p.uuid, label: p.title })),
);
</script>

<template>
  <ListTemplate
    title="Compliance"
    :description="`How ${systemName} measures up against its profiles.`"
  >
    <template v-if="profiles.length > 1" #banner>
      <FormField label="Profile">
        <Select
          :model-value="profileId ?? ''"
          :options="profileOptions"
          @update:model-value="
            (value) => go({ profile: value, status: '', q: '' })
          "
        />
      </FormField>
    </template>

    <DataState
      v-if="status === 'no-profile'"
      status="empty"
      subject="compliance"
      empty-title="No profile attached"
      empty-body="Compliance is measured against the controls of a profile. Attach one to this system on Implementation."
      icon="controls"
    >
      <template #empty-actions>
        <TextLink :to="{ name: 'system-implementation', params: { systemId } }"
          >Go to Implementation</TextLink
        >
      </template>
    </DataState>

    <DataState
      v-else
      :status="status"
      subject="compliance"
      skeleton="panel"
      @retry="load"
    >
      <ComplianceProgressView
        v-if="progress"
        :progress="progress"
        :system-id="systemId"
      />
    </DataState>
  </ListTemplate>
</template>
