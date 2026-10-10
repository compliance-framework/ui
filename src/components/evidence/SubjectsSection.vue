<template>
  <!-- The evidence's subjects; the page gives this its card and heading. -->
  <section data-testid="subjects-section">
    <p
      v-if="subjects.length === 0"
      class="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400"
    >
      <BIconExclamationTriangle aria-hidden="true" />
      Unattributed
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="subject in visibleSubjects"
        :key="subject.subjectUuid"
        class="rounded-md border border-ccf-300 p-3 dark:border-slate-700"
        data-testid="subject-block"
      >
        <div class="flex items-center gap-3">
          <!-- Long titles are cut short; the tooltip shows them in full. -->
          <p
            v-tooltip.top="subject.title || subject.subjectUuid"
            class="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-slate-100"
            data-testid="subject-title"
          >
            <a
              v-if="subjectHref(subject)"
              :href="subjectHref(subject)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline dark:text-blue-400"
            >
              {{ subject.title || subject.subjectUuid }}
            </a>
            <template v-else>
              {{ subject.title || subject.subjectUuid }}
            </template>
          </p>

          <RouterLink
            :to="{
              name: 'evidence:index',
              query: { subject: subject.subjectUuid },
            }"
            class="shrink-0 whitespace-nowrap text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Other evidence
          </RouterLink>
        </div>

        <dl
          v-if="details[subject.subjectUuid]?.linkedSsps?.length"
          class="mt-1 text-sm text-gray-700 dark:text-slate-300"
        >
          <dt class="mr-1 inline font-medium">Linked in SSPs:</dt>
          <dd class="inline">
            {{ formatLinkedSsps(details[subject.subjectUuid]!) }}
          </dd>
        </dl>
      </li>
    </ul>

    <button
      v-if="hiddenCount > 0"
      type="button"
      class="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
      data-testid="subjects-toggle"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? 'Show fewer subjects'
          : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'subject' : 'subjects'}`
      }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { BIconExclamationTriangle } from 'bootstrap-icons-vue';
import type { SubjectReference } from '@/oscal';
import { useSubjectSearch } from '@/composables/subjects/useSubjectSearch';
import { getSafeExternalHref } from '@/utils/links';
import { subjectSource, type SubjectSummary } from '@/types/subjects';

const props = defineProps<{
  // The evidence's subject references, already in display order.
  subjectReferences: SubjectReference[];
}>();

const { lookup } = useSubjectSearch();

// Legacy subjects (plugin identifiers) don't attribute the evidence, so they're not shown.
const subjects = computed(() =>
  props.subjectReferences.filter((ref) => subjectSource(ref) !== 'legacy'),
);

// The first few subjects are shown; the rest are behind "Show N more".
const COLLAPSED_LIMIT = 2;
const expanded = ref(false);
const visibleSubjects = computed(() =>
  expanded.value ? subjects.value : subjects.value.slice(0, COLLAPSED_LIMIT),
);
const hiddenCount = computed(() =>
  Math.max(subjects.value.length - COLLAPSED_LIMIT, 0),
);

// Linked SSPs come from the subjects themselves, not the evidence; until they load (or
// if they can't) that line is left out.
const details = ref<Record<string, SubjectSummary>>({});
let lookupRequest = 0;

watch(
  () => subjects.value.map((subject) => subject.subjectUuid),
  async (ids) => {
    const request = ++lookupRequest;
    details.value = {};
    const found = await lookup(ids);
    if (request !== lookupRequest) {
      return;
    }
    details.value = Object.fromEntries(
      found.map((subject) => [subject.subjectUuid, subject]),
    );
  },
  { immediate: true },
);

// The subject's own link, preferring its canonical one, when it's safe to open. The title
// links to it.
function subjectHref(subject: SubjectReference) {
  const links = subject.links ?? [];
  const link = links.find((l) => l.rel === 'canonical') ?? links[0];
  return getSafeExternalHref(link?.href);
}

function formatLinkedSsps(subject: SubjectSummary) {
  return (subject.linkedSsps ?? [])
    .map((link) => `${link.sspTitle || link.sspId} → "${link.componentTitle}"`)
    .join(', ');
}
</script>
