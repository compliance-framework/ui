<template>
  <div class="space-y-4">
    <section
      v-if="showLoadingState"
      class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-6 py-5 text-center"
    >
      <p
        class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
      >
        Loading compliance data...
      </p>
      <p
        class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
      >
        Fetching profile compliance progress for this SSP.
      </p>
    </section>

    <section
      v-else-if="showNoProfileState"
      class="flex flex-col items-center justify-center gap-2 border border-[#1e66f540] bg-[#1e66f515] px-6 py-5 text-center"
    >
      <p
        class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-info)]"
      >
        No profile attached.
      </p>
      <p
        class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
      >
        Attach a profile in OVERVIEW to view compliance data.
      </p>
    </section>

    <section
      v-else-if="showNoDataState"
      class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-6 py-5 text-center"
    >
      <p
        class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
      >
        No compliance data available.
      </p>
      <p
        class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
      >
        Compliance results appear once profile data is available.
      </p>
    </section>

    <section
      v-else-if="showErrorState"
      class="flex flex-col items-center justify-center gap-2 border border-[#d20f3940] bg-[#d20f3915] px-6 py-5 text-center"
    >
      <p
        class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-error)]"
      >
        Unable to load compliance data.
      </p>
      <p
        class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[#b52134]"
      >
        Check API availability and profile linkage, then retry.
      </p>
    </section>

    <template v-else>
      <section
        class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
      >
        <h2
          class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
        >
          OVERALL COMPLIANCE PROGRESS
        </h2>

        <div class="grid gap-[10px] sm:grid-cols-2 xl:grid-cols-5">
          <article
            v-for="tile in summaryTiles"
            :key="tile.label"
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              {{ tile.label }}
            </p>
            <p
              class="font-[var(--ui-v2-font-primary)] text-2xl font-bold"
              :class="tile.valueClass"
            >
              {{ tile.value }}
            </p>
          </article>
        </div>

        <div class="flex items-center justify-between gap-3">
          <p
            class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
          >
            {{ progressSatisfiedLabel }}
          </p>
          <p class="ui-v2-nav font-bold text-[var(--ui-v2-foreground)]">
            {{ compliancePercent }}%
          </p>
        </div>

        <div
          class="flex h-[10px] overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
        >
          <div
            class="h-full bg-[var(--ui-v2-success)]"
            :style="{ width: `${summaryWidths.satisfied}%` }"
          />
          <div
            class="h-full bg-[var(--ui-v2-error)]"
            :style="{ width: `${summaryWidths.notSatisfied}%` }"
          />
          <div
            class="h-full bg-[#9ca0b0]"
            :style="{ width: `${summaryWidths.unknown}%` }"
          />
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <span class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
            >SATISFIED</span
          >
          <span class="h-2 w-2 bg-[var(--ui-v2-success)]" />
          <span class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
            >NOT SATISFIED</span
          >
          <span class="h-2 w-2 bg-[var(--ui-v2-error)]" />
          <span class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
            >UNKNOWN</span
          >
          <span class="h-2 w-2 bg-[#9ca0b0]" />
        </div>

        <div class="flex items-center justify-between gap-3">
          <p
            class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
          >
            IMPLEMENTATION COVERAGE
          </p>
          <p class="ui-v2-nav font-bold text-[var(--ui-v2-foreground)]">
            {{ implementationPercent }}%
          </p>
        </div>

        <div
          class="flex h-[10px] overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
        >
          <div
            class="h-full bg-[var(--ui-v2-info)]"
            :style="{ width: `${implementationPercent}%` }"
          />
        </div>

        <p
          class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
        >
          {{ implementedControls }} IMPLEMENTED /
          {{ unimplementedControls }} NOT IMPLEMENTED
        </p>
      </section>

      <section
        v-if="groupRows.length"
        class="space-y-[10px] border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
      >
        <h2
          class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
        >
          DETAILED GROUP BREAKDOWN
        </h2>

        <div class="grid gap-[10px] 2xl:grid-cols-2">
          <article
            v-for="group in groupRows"
            :key="group.id"
            class="space-y-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="ui-v2-label text-[var(--ui-v2-foreground)]">
                {{ group.label }}
              </p>
              <p
                class="ui-v2-nav font-bold text-[var(--ui-v2-secondary-foreground)]"
              >
                {{ group.compliancePercent }}% COMPLIANT
              </p>
            </div>

            <div
              class="flex h-2 overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)]"
            >
              <div
                class="h-full bg-[var(--ui-v2-success)]"
                :style="{ width: `${group.widths.satisfied}%` }"
              />
              <div
                class="h-full bg-[var(--ui-v2-error)]"
                :style="{ width: `${group.widths.notSatisfied}%` }"
              />
              <div
                class="h-full bg-[#9ca0b0]"
                :style="{ width: `${group.widths.unknown}%` }"
              />
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <p
                class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
              >
                {{ group.satisfied }} satisfied
              </p>
              <p
                class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
              >
                {{ group.notSatisfied }} not satisfied
              </p>
              <p
                class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
              >
                {{ group.unknown }} unknown
              </p>
              <p
                class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
              >
                {{ group.notImplemented }} not implemented
              </p>
            </div>
          </article>
        </div>
      </section>

      <section
        class="space-y-[10px] border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
      >
        <div class="flex items-center justify-between gap-3">
          <h2
            class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
          >
            CONTROLS
          </h2>
          <p
            class="ui-v2-nav font-bold text-[var(--ui-v2-secondary-foreground)]"
          >
            {{ totalControls }} TOTAL
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <span class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
            >EVIDENCE:</span
          >

          <span class="flex items-center gap-1">
            <span
              class="flex h-5 w-5 items-center justify-center bg-[var(--ui-v2-success)] font-[var(--ui-v2-font-secondary)] text-[11px] font-bold text-[var(--ui-v2-background)]"
              >G</span
            >
            <span
              class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
              >SATISFIED</span
            >
          </span>

          <span class="flex items-center gap-1">
            <span
              class="flex h-5 w-5 items-center justify-center bg-[#9ca0b0] font-[var(--ui-v2-font-secondary)] text-[11px] font-bold text-[var(--ui-v2-background)]"
              >U</span
            >
            <span
              class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
              >UNKNOWN / INCOMPLETE</span
            >
          </span>

          <span class="flex items-center gap-1">
            <span
              class="flex h-5 w-5 items-center justify-center bg-[var(--ui-v2-error)] font-[var(--ui-v2-font-secondary)] text-[11px] font-bold text-[var(--ui-v2-background)]"
              >R</span
            >
            <span
              class="ui-v2-nav font-semibold text-[var(--ui-v2-secondary-foreground)]"
              >NOT SATISFIED</span
            >
          </span>
        </div>

        <div class="overflow-x-auto border border-[var(--ui-v2-border)]">
          <div
            class="flex min-w-[1020px] items-center border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-[10px] py-2"
          >
            <p
              class="ui-v2-label flex-1 text-[var(--ui-v2-secondary-foreground)]"
            >
              CONTROL
            </p>
            <p
              class="ui-v2-label w-[300px] text-[var(--ui-v2-secondary-foreground)]"
            >
              GROUP
            </p>
            <p
              class="ui-v2-label w-[145px] text-[var(--ui-v2-secondary-foreground)]"
            >
              STATUS
            </p>
            <p
              class="ui-v2-label w-[120px] text-[var(--ui-v2-secondary-foreground)]"
            >
              EVIDENCE
            </p>
          </div>

          <div
            v-for="(row, index) in controlRows"
            :key="row.key"
            class="flex min-w-[1020px] items-center bg-[var(--ui-v2-background)] px-[10px] py-2"
            :class="
              index < controlRows.length - 1
                ? 'border-b border-[var(--ui-v2-border)]'
                : ''
            "
          >
            <div class="flex-1 min-w-0 space-y-0.5">
              <p class="ui-v2-label text-[var(--ui-v2-foreground)]">
                {{ row.controlId }}
              </p>
              <p
                class="font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold leading-[1.35] tracking-[0.2px] normal-case text-[var(--ui-v2-secondary-foreground)]"
              >
                {{ row.controlTitle }}
              </p>
            </div>

            <div class="w-[300px]">
              <p
                class="ui-v2-nav font-semibold text-[var(--ui-v2-muted-foreground)]"
              >
                {{ row.groupLabel }}
              </p>
            </div>

            <div class="w-[145px]">
              <span
                class="inline-flex items-center justify-center border px-2 py-1"
                :class="row.status.containerClass"
              >
                <span
                  class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] leading-none"
                  :class="row.status.textClass"
                >
                  {{ row.status.label }}
                </span>
              </span>
            </div>

            <div class="flex w-[120px] items-center gap-0.5">
              <span
                class="flex h-6 w-8 items-center justify-center bg-[var(--ui-v2-success)] font-[var(--ui-v2-font-secondary)] text-[11px] font-bold text-[var(--ui-v2-background)]"
                >{{ row.evidence.g }}</span
              >
              <span
                class="flex h-6 w-8 items-center justify-center bg-[#9ca0b0] font-[var(--ui-v2-font-secondary)] text-[11px] font-bold text-[var(--ui-v2-background)]"
                >{{ row.evidence.u }}</span
              >
              <span
                class="flex h-6 w-8 items-center justify-center bg-[var(--ui-v2-error)] font-[var(--ui-v2-font-secondary)] text-[11px] font-bold text-[var(--ui-v2-background)]"
                >{{ row.evidence.r }}</span
              >
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onActivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProfileCompliance } from '@/composables/useProfileCompliance';
import {
  computeComplianceWidths,
  controlKey,
  statusCount,
} from '@/utils/compliance';
import {
  sspDetailProfileBindingKey,
  type SspDetailProfileBinding,
} from './sspDetailProfileBinding';

interface ComplianceSummaryTile {
  label: string;
  value: number | string;
  valueClass: string;
}

interface GroupBreakdownRow {
  id: string;
  label: string;
  compliancePercent: number;
  satisfied: number;
  notSatisfied: number;
  unknown: number;
  notImplemented: number;
  widths: {
    satisfied: number;
    notSatisfied: number;
    unknown: number;
  };
}

interface StatusDisplay {
  label: string;
  containerClass: string;
  textClass: string;
}

interface ControlTableRow {
  key: string;
  controlId: string;
  controlTitle: string;
  groupLabel: string;
  status: StatusDisplay;
  evidence: {
    g: number;
    u: number;
    r: number;
  };
}

const route = useRoute();
const sspId = computed(() => String(route.params.id || ''));

const profileBinding = inject<SspDetailProfileBinding | null>(
  sspDetailProfileBindingKey,
  null,
);

const profileResolved = computed(
  () => profileBinding?.profileResolved.value || false,
);

const attachedProfileId = computed(
  () => profileBinding?.attachedProfileId.value || '',
);

const {
  progress,
  summary,
  controls,
  groups,
  isLoading,
  error,
  loadCompliance,
} = useProfileCompliance(attachedProfileId);

const hasCurrentProgress = computed(() =>
  Boolean(
    progress.value &&
      attachedProfileId.value &&
      progress.value.scope.id === attachedProfileId.value,
  ),
);

const totalControls = computed(() => summary.value?.totalControls || 0);
const satisfiedControls = computed(() => summary.value?.satisfied || 0);
const notSatisfiedControls = computed(() => summary.value?.notSatisfied || 0);
const unknownControls = computed(() => summary.value?.unknown || 0);
const compliancePercent = computed(() => summary.value?.compliancePercent || 0);
const assessedPercent = computed(() => summary.value?.assessedPercent || 0);

const implementedControls = computed(() => {
  if (progress.value?.implementation) {
    return progress.value.implementation.implementedControls;
  }

  return summary.value?.implementedControls || 0;
});

const unimplementedControls = computed(() => {
  if (progress.value?.implementation) {
    return progress.value.implementation.unimplementedControls;
  }

  return Math.max(totalControls.value - implementedControls.value, 0);
});

const implementationPercent = computed(() => {
  if (progress.value?.implementation) {
    return progress.value.implementation.implementationPercent;
  }

  if (!totalControls.value) {
    return 0;
  }

  return Math.round((implementedControls.value / totalControls.value) * 100);
});

const summaryTiles = computed<ComplianceSummaryTile[]>(() => [
  {
    label: 'SATISFIED',
    value: satisfiedControls.value,
    valueClass: 'text-[var(--ui-v2-success)]',
  },
  {
    label: 'NOT SATISFIED',
    value: notSatisfiedControls.value,
    valueClass: 'text-[var(--ui-v2-error)]',
  },
  {
    label: 'UNKNOWN',
    value: unknownControls.value,
    valueClass: 'text-[#7c7f93]',
  },
  {
    label: 'COMPLIANCE',
    value: `${compliancePercent.value}%`,
    valueClass: 'text-[var(--ui-v2-info)]',
  },
  {
    label: 'ASSESSED',
    value: `${assessedPercent.value}%`,
    valueClass: 'text-[var(--ui-v2-foreground)]',
  },
]);

const summaryWidths = computed(() => computeComplianceWidths(summary.value));

const progressSatisfiedLabel = computed(
  () => `${satisfiedControls.value}/${totalControls.value} CONTROLS SATISFIED`,
);

const showNoProfileState = computed(
  () => profileResolved.value && !attachedProfileId.value,
);

const showLoadingState = computed(() => {
  if (!profileResolved.value) {
    return true;
  }

  if (!attachedProfileId.value) {
    return false;
  }

  if (isLoading.value) {
    return true;
  }

  return !hasCurrentProgress.value && !error.value;
});

const showErrorState = computed(
  () =>
    profileResolved.value &&
    Boolean(attachedProfileId.value) &&
    Boolean(error.value) &&
    !showLoadingState.value,
);

const showNoDataState = computed(() => {
  if (
    showLoadingState.value ||
    showNoProfileState.value ||
    showErrorState.value
  ) {
    return false;
  }

  if (!hasCurrentProgress.value) {
    return true;
  }

  return totalControls.value === 0;
});

const groupRows = computed<GroupBreakdownRow[]>(() =>
  groups.value.map((group) => ({
    id: group.id,
    label: formatGroupLabel(group.id, group.title),
    compliancePercent: group.compliancePercent,
    satisfied: group.satisfied,
    notSatisfied: group.notSatisfied,
    unknown: group.unknown,
    notImplemented: groupNotImplementedCount(group.id),
    widths: computeComplianceWidths(group),
  })),
);

const controlRows = computed<ControlTableRow[]>(() =>
  controls.value.map((control) => ({
    key: controlKey(control),
    controlId: String(control.controlId || '').toUpperCase(),
    controlTitle: String(control.title || ''),
    groupLabel: formatGroupLabel(control.groupId, control.groupTitle),
    status: controlStatusDisplay(control.computedStatus),
    evidence: {
      g: statusCount(control, 'satisfied'),
      u: statusCount(control, 'unknown') + statusCount(control, 'incomplete'),
      r: statusCount(control, 'not-satisfied'),
    },
  })),
);

watch(
  [sspId, attachedProfileId],
  async ([id, profileId]) => {
    if (!id || !profileId) {
      return;
    }

    try {
      await loadCompliance({
        includeControls: true,
        sspId: id,
      });
    } catch {
      // Error state is rendered from the composable error ref.
    }
  },
  { immediate: true },
);

const hasActivatedOnce = ref(false);

onActivated(async () => {
  if (!sspId.value || !attachedProfileId.value) {
    return;
  }

  if (!hasActivatedOnce.value) {
    hasActivatedOnce.value = true;
    return;
  }

  try {
    await loadCompliance({
      includeControls: true,
      sspId: sspId.value,
    });
  } catch {
    // Error state is rendered from the composable error ref.
  }
});

function groupNotImplementedCount(groupId: string): number {
  return controls.value.filter(
    (control) => control.groupId === groupId && control.implemented === false,
  ).length;
}

function formatGroupLabel(groupId?: string, groupTitle?: string): string {
  const id = String(groupId || '').trim();
  const title = String(groupTitle || '').trim();

  if (id && title) {
    return `${id} ${title}`.toUpperCase();
  }

  if (title) {
    return title.toUpperCase();
  }

  if (id) {
    return id.toUpperCase();
  }

  return 'UNGROUPED';
}

function controlStatusDisplay(status: string): StatusDisplay {
  switch (status) {
    case 'satisfied':
      return {
        label: 'SATISFIED',
        containerClass:
          'border-[color:var(--ui-v2-success)_/_0.3] bg-[var(--ui-v2-success-tint-10)]',
        textClass: 'text-[var(--ui-v2-success)]',
      };
    case 'not-satisfied':
      return {
        label: 'NOT SATISFIED',
        containerClass:
          'border-[color:var(--ui-v2-error)_/_0.3] bg-[var(--ui-v2-error-tint-10)]',
        textClass: 'text-[var(--ui-v2-error)]',
      };
    default:
      return {
        label: 'UNKNOWN',
        containerClass: 'border-[#9ca0b0] bg-[color:#9ca0b0_/_0.3]',
        textClass: 'text-[var(--ui-v2-secondary-foreground)]',
      };
  }
}
</script>
