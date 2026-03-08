<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import type { Profile, SystemSecurityPlan } from '@/oscal';
import type {
  ProfileComplianceProgress,
  ProfileComplianceSummary,
} from '@/types/compliance';
import { computeComplianceWidths } from '@/utils/compliance';

interface ComplianceItem {
  sspId: string;
  sspTitle: string;
  profileTitle: string;
  summary: ProfileComplianceSummary;
}

const router = useRouter();
const items = ref<ComplianceItem[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

const { execute: fetchSSPs } = useDataApi<SystemSecurityPlan[]>(null, null, {
  immediate: false,
});

const { execute: fetchProfile } = useDataApi<Profile>(null, null, {
  immediate: false,
});

const { execute: fetchCompliance } = useDataApi<ProfileComplianceProgress>(
  null,
  null,
  {
    immediate: false,
  },
);

const hasItems = computed(() => items.value.length > 0);
const gridClass = computed(() =>
  items.value.length === 1 ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2',
);

function widths(summary: ProfileComplianceSummary) {
  return computeComplianceWidths(summary);
}

function openCompliance(sspId: string): void {
  router.push({
    name: 'system-security-plan-compliance',
    params: { id: sspId },
  });
}

async function loadItems(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const { data: response } = await fetchSSPs(
      '/api/oscal/system-security-plans',
    );
    const ssps = response.value?.data ?? [];

    const nextItems: ComplianceItem[] = [];
    let failedCount = 0;

    for (const ssp of ssps) {
      try {
        const { data: profileResponse } = await fetchProfile(
          `/api/oscal/system-security-plans/${ssp.uuid}/profile`,
        );
        const profile = profileResponse.value?.data;

        if (!profile) {
          continue;
        }

        const { data: complianceResponse } = await fetchCompliance(
          `/api/oscal/profiles/${profile.uuid}/compliance-progress?includeControls=false`,
        );
        const progress = complianceResponse.value?.data;

        if (!progress?.summary) {
          failedCount += 1;
          continue;
        }

        nextItems.push({
          sspId: ssp.uuid,
          sspTitle: ssp.metadata?.title || 'Untitled SSP',
          profileTitle: profile.metadata?.title || 'Untitled Profile',
          summary: progress.summary,
        });
      } catch {
        failedCount += 1;
      }
    }

    items.value = nextItems;

    if (nextItems.length === 0 && failedCount > 0) {
      errorMessage.value = 'Unable to load compliance posture.';
    }
  } catch (loadError) {
    errorMessage.value =
      loadError instanceof Error
        ? loadError.message
        : 'Unable to load compliance posture.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadItems();
});
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1.5">
      <h2 class="ui-v2-section-title text-[var(--ui-v2-foreground)]">
        COMPLIANCE POSTURE
      </h2>
      <p class="ui-v2-meta text-[var(--ui-v2-secondary-foreground)]">
        Compliance progress for SSPs with attached profiles
      </p>
    </header>

    <div
      v-if="isLoading"
      class="grid gap-4 md:grid-cols-2"
      aria-label="Loading compliance posture"
    >
      <article
        v-for="index in 4"
        :key="index"
        class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
      >
        <div class="space-y-2">
          <div class="h-5 w-2/3 animate-pulse bg-[#9ca0b066]" />
          <div class="h-3 w-1/2 animate-pulse bg-[#9ca0b066]" />
        </div>
        <div class="grid gap-[10px] md:grid-cols-5">
          <div
            v-for="tile in 5"
            :key="tile"
            class="h-20 animate-pulse border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
          />
        </div>
        <div class="h-[10px] animate-pulse bg-[#9ca0b066]" />
      </article>
    </div>

    <V2StatePanel
      v-else-if="errorMessage"
      kind="error"
      title="Unable to load compliance posture."
      :description="errorMessage"
    >
      <template #actions>
        <button
          type="button"
          class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
          @click="loadItems"
        >
          Retry
        </button>
      </template>
    </V2StatePanel>

    <V2StatePanel
      v-else-if="!hasItems"
      kind="empty"
      title="No compliance posture available"
      description="No system security plans with attached profiles are available yet."
    >
      <template #actions>
        <RouterLink
          :to="{ name: 'system-security-plans' }"
          class="ui-v2-nav inline-flex items-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
        >
          OPEN SSP LIBRARY
        </RouterLink>
      </template>
    </V2StatePanel>

    <div v-else :class="gridClass">
      <button
        v-for="item in items"
        :key="item.sspId"
        type="button"
        class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 text-left transition-colors hover:bg-[var(--ui-v2-surface)]"
        @click="openCompliance(item.sspId)"
      >
        <div class="space-y-1">
          <h3
            class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold text-[var(--ui-v2-foreground)]"
          >
            {{ item.sspTitle }}
          </h3>
          <p class="ui-v2-meta text-[var(--ui-v2-secondary-foreground)]">
            {{ item.profileTitle }}
          </p>
        </div>

        <div class="grid gap-[10px] md:grid-cols-5">
          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              SATISFIED
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-success)]">
              {{ item.summary.satisfied }}
            </p>
          </article>

          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              NOT SAT
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-error)]">
              {{ item.summary.notSatisfied }}
            </p>
          </article>

          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              UNKNOWN
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-secondary-foreground)]">
              {{ item.summary.unknown }}
            </p>
          </article>

          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              COMPLIANCE
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-info)]">
              {{ item.summary.compliancePercent }}%
            </p>
          </article>

          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              ASSESSED
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-foreground)]">
              {{ item.summary.assessedPercent }}%
            </p>
          </article>
        </div>

        <div class="flex items-center justify-between gap-3">
          <p
            class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
          >
            {{ item.summary.satisfied }}/{{ item.summary.totalControls }}
            CONTROLS SATISFIED
          </p>
          <p class="ui-v2-nav font-bold text-[var(--ui-v2-foreground)]">
            {{ item.summary.compliancePercent }}%
          </p>
        </div>

        <div
          class="flex h-[10px] overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
        >
          <div
            class="h-full bg-[var(--ui-v2-success)]"
            :style="{ width: `${widths(item.summary).satisfied}%` }"
          />
          <div
            class="h-full bg-[var(--ui-v2-error)]"
            :style="{ width: `${widths(item.summary).notSatisfied}%` }"
          />
          <div
            class="h-full bg-[#9ca0b0]"
            :style="{ width: `${widths(item.summary).unknown}%` }"
          />
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <span
            class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
          >
            <span
              class="mr-1 inline-block h-2 w-2 bg-[var(--ui-v2-success)] align-middle"
            />
            {{ item.summary.satisfied }} satisfied
          </span>
          <span
            class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
          >
            <span
              class="mr-1 inline-block h-2 w-2 bg-[var(--ui-v2-error)] align-middle"
            />
            {{ item.summary.notSatisfied }} not satisfied
          </span>
          <span
            class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
          >
            <span class="mr-1 inline-block h-2 w-2 bg-[#9ca0b0] align-middle" />
            {{ item.summary.unknown }} unknown
          </span>
        </div>
      </button>
    </div>
  </section>
</template>
