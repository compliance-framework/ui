<template>
  <div v-if="!isLoading && complianceItems.length > 0" class="mt-6">
    <PageHeader>Compliance Posture</PageHeader>
    <PageSubHeader
      >Compliance progress for SSPs with attached profiles</PageSubHeader
    >

    <div :class="gridClass">
      <PageCard
        v-for="item in complianceItems"
        :key="item.sspId"
        class="cursor-pointer transition-shadow hover:shadow-md"
        role="button"
        tabindex="0"
        @click="navigateToCompliance(item.sspId)"
        @keydown.enter="navigateToCompliance(item.sspId)"
        @keydown.space.prevent="navigateToCompliance(item.sspId)"
      >
        <div class="mb-4 space-y-1">
          <h3
            class="text-3xl font-medium leading-snug text-zinc-700 dark:text-slate-300"
          >
            {{ item.sspTitle }}
          </h3>
          <p class="text-xl text-zinc-600 dark:text-slate-400">
            {{ item.profileTitle }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p class="text-xs uppercase tracking-wide text-emerald-700">
              Satisfied
            </p>
            <p class="mt-2 text-3xl font-semibold text-emerald-800">
              {{ item.summary.satisfied }}
            </p>
          </div>

          <div class="rounded-lg border border-red-200 bg-red-50 p-4">
            <p class="text-xs uppercase tracking-wide text-red-700">
              Not Satisfied
            </p>
            <p class="mt-2 text-3xl font-semibold text-red-800">
              {{ item.summary.notSatisfied }}
            </p>
          </div>

          <div class="rounded-lg border border-slate-300 bg-slate-100 p-4">
            <p class="text-xs uppercase tracking-wide text-slate-700">
              Unknown
            </p>
            <p class="mt-2 text-3xl font-semibold text-slate-800">
              {{ item.summary.unknown }}
            </p>
          </div>

          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p class="text-xs uppercase tracking-wide text-blue-700">
              Compliance
            </p>
            <p class="mt-2 text-3xl font-semibold text-blue-800">
              {{ item.summary.compliancePercent }}%
            </p>
          </div>

          <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p class="text-xs uppercase tracking-wide text-indigo-700">
              Assessed
            </p>
            <p class="mt-2 text-3xl font-semibold text-indigo-800">
              {{ item.summary.assessedPercent }}%
            </p>
          </div>
        </div>

        <div class="mt-5 mb-2 flex items-center justify-between text-sm">
          <span class="text-zinc-600 dark:text-slate-400">
            {{ item.summary.satisfied }}/{{ item.summary.totalControls }}
            controls satisfied
          </span>
          <span class="font-semibold text-zinc-900 dark:text-slate-200">
            {{ item.summary.compliancePercent }}%
          </span>
        </div>

        <div
          class="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-slate-700"
        >
          <div
            class="bg-emerald-600"
            :style="{
              width: `${satisfiedWidth(item.summary)}%`,
            }"
          ></div>
          <div
            class="bg-red-500"
            :style="{
              width: `${notSatisfiedWidth(item.summary)}%`,
            }"
          ></div>
          <div
            class="bg-slate-400"
            :style="{
              width: `${unknownWidth(item.summary)}%`,
            }"
          ></div>
        </div>

        <div
          class="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-slate-400"
        >
          <span class="inline-flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
            {{ item.summary.satisfied }} satisfied
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
            {{ item.summary.notSatisfied }} not satisfied
          </span>
          <span class="inline-flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
            {{ item.summary.unknown }} unknown
          </span>
        </div>
      </PageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PageCard from '@/components/PageCard.vue';
import { useDataApi } from '@/composables/axios';
import type { SystemSecurityPlan, Profile } from '@/oscal';
import type { ProfileComplianceSummary } from '@/types/compliance';
import { computeComplianceWidths } from '@/utils/compliance';

interface ComplianceItem {
  sspId: string;
  sspTitle: string;
  profileTitle: string;
  summary: ProfileComplianceSummary;
}

const router = useRouter();
const complianceItems = ref<ComplianceItem[]>([]);
const isLoading = ref(true);

const gridClass = computed(() => {
  if (complianceItems.value.length === 1) {
    return 'mt-4 grid grid-cols-1 gap-4';
  }

  return 'mt-4 grid grid-cols-1 gap-4 md:grid-cols-2';
});

const { execute: fetchSSPs } = useDataApi<SystemSecurityPlan[]>(null, null, {
  immediate: false,
});

const { execute: fetchProfile } = useDataApi<Profile>(null, null, {
  immediate: false,
});

interface ComplianceProgressResponse {
  summary: ProfileComplianceSummary;
}

const { execute: fetchCompliance } = useDataApi<ComplianceProgressResponse>(
  null,
  null,
  { immediate: false },
);

onMounted(async () => {
  try {
    const { data: sspsData } = await fetchSSPs(
      '/api/oscal/system-security-plans',
    );
    const ssps = sspsData.value?.data;
    if (!ssps || ssps.length === 0) {
      isLoading.value = false;
      return;
    }

    const results: ComplianceItem[] = [];

    for (const ssp of ssps) {
      try {
        const { data: profileData } = await fetchProfile(
          `/api/oscal/system-security-plans/${ssp.uuid}/profile`,
        );
        const profile = profileData.value?.data;
        if (!profile) {
          continue;
        }

        const { data: complianceData } = await fetchCompliance(
          `/api/oscal/profiles/${profile.uuid}/compliance-progress?includeControls=false`,
        );
        const progress = complianceData.value?.data;
        if (!progress?.summary) {
          continue;
        }

        results.push({
          sspId: ssp.uuid,
          sspTitle: ssp.metadata?.title || 'Untitled SSP',
          profileTitle: profile.metadata?.title || 'Untitled Profile',
          summary: progress.summary,
        });
      } catch {
        // Skip SSPs without profiles or with errors
      }
    }

    complianceItems.value = results;
  } finally {
    isLoading.value = false;
  }
});

function satisfiedWidth(summary: ProfileComplianceSummary): number {
  return computeComplianceWidths(summary).satisfied;
}

function notSatisfiedWidth(summary: ProfileComplianceSummary): number {
  return computeComplianceWidths(summary).notSatisfied;
}

function unknownWidth(summary: ProfileComplianceSummary): number {
  return computeComplianceWidths(summary).unknown;
}

function navigateToCompliance(sspId: string) {
  router.push({
    name: 'system-security-plan-compliance',
    params: { id: sspId },
  });
}
</script>
