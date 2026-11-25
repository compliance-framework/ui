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
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import ComplianceProgressView from './ComplianceProgressView.vue';
import { readView, viewQuery, type ComplianceView } from './complianceView';
import { mergeProgress } from './mergeProgress';

/**
 * This System > Compliance: how the system measures up against its attached profiles. Totals,
 * overall and per-group breakdowns, implementation coverage, and every control with its status
 * and evidence. Each total filters the controls below it. With several profiles attached, they
 * are checkboxes above ("Include controls from", as on Implementation), all ticked by default: the
 * ticked profiles' controls are counted together, each control once. The profiles left out, the
 * filter and the search live in the URL.
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
  for (const key of ['exclude', 'status', 'q']) delete query[key];
  return { ...query, ...viewQuery(next) };
}
function go(patch: Partial<ComplianceView>): void {
  void router.push({ query: withView({ ...view.value, ...patch }) });
}

// Profiles and progress ------------------------------------------------------------------------

const profiles = ref<{ uuid: string; title: string }[]>([]);
const status = ref<QueryStatus | 'no-profile'>('loading');
/** Each profile's progress once fetched, so ticking one back on doesn't fetch it again. */
const fetched = ref<Record<string, ProfileComplianceProgress>>({});

const includedIds = computed(() =>
  profiles.value
    .map((p) => p.uuid)
    .filter((id) => !view.value.exclude.includes(id)),
);
const progress = computed(() =>
  mergeProgress(includedIds.value.flatMap((id) => fetched.value[id] ?? [])),
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
/** Fetches the included profiles' progress not fetched yet; `fresh` fetches them all again. */
async function loadProgress(fresh = false): Promise<void> {
  const request = ++latest;
  const missing = includedIds.value.filter((id) => fresh || !fetched.value[id]);
  if (!missing.length) {
    status.value = 'ready';
    return;
  }
  status.value = 'loading';
  try {
    const responses = await Promise.all(
      missing.map((id) =>
        api.get<DataResponse<ProfileComplianceProgress>>(
          `/api/oscal/profiles/${id}/compliance-progress`,
          { params: { includeControls: true, sspId: systemId } },
        ),
      ),
    );
    if (request !== latest) return;
    const next = { ...fetched.value };
    missing.forEach((id, i) => (next[id] = responses[i]!.data.data));
    fetched.value = next;
    status.value = 'ready';
  } catch (error) {
    if (request !== latest) return;
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}

async function load(): Promise<void> {
  await loadProfiles();
  if (profiles.value.length) await loadProgress(true);
}
void load();
watch(includedIds, (ids, previous) => {
  if (previous && ids.join() !== previous.join()) void loadProgress();
});

const profileOptions = computed(() =>
  profiles.value.map((p) => ({ value: p.uuid, label: p.title })),
);
function include(ids: string[]): void {
  go({
    exclude: profiles.value
      .map((p) => p.uuid)
      .filter((id) => !ids.includes(id)),
  });
}
</script>

<template>
  <ListTemplate
    title="Compliance"
    :description="`How ${systemName} measures up against its profiles.`"
  >
    <template v-if="profiles.length > 1" #banner>
      <CheckboxGroup
        :model-value="includedIds"
        legend="Include controls from"
        :options="profileOptions"
        @update:model-value="include"
      />
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
      <Text v-if="!includedIds.length" variant="secondary"
        >Include the controls from at least one profile.</Text
      >
      <ComplianceProgressView
        v-else-if="progress"
        :progress="progress"
        :system-id="systemId"
      />
    </DataState>
  </ListTemplate>
</template>
