<script setup lang="ts">
import type { ImplementedRequirement, Statement } from '@/oscal';
import PartDisplay from '@/components/PartDisplay.vue';
import type { Part } from '@/oscal';
import { ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import type { Control } from '@/oscal';

const { control, implementation } = defineProps<{
  control: Control;
  implementation: ImplementedRequirement | undefined | null;
}>();
const router = useRouter();
const statements = ref<{ [key: string]: Statement }>({});
type ImplementationStatusCue = {
  label: string;
  countClass: string;
  panelClass: string;
};

const neutralCountClass =
  'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
const neutralPanelClass =
  'border-transparent bg-transparent dark:border-transparent dark:bg-transparent';
const implementationStatusCues: Record<string, ImplementationStatusCue> = {
  implemented: {
    label: 'Implemented',
    countClass: 'bg-blue-600 text-white dark:bg-blue-400 dark:text-blue-950',
    panelClass:
      'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20',
  },
  partial: {
    label: 'Partial',
    countClass: 'bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950',
    panelClass:
      'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
  },
  planned: {
    label: 'Planned',
    countClass: 'bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950',
    panelClass:
      'border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20',
  },
  alternative: {
    label: 'Alternative',
    countClass:
      'bg-violet-600 text-white dark:bg-violet-400 dark:text-violet-950',
    panelClass:
      'border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20',
  },
  'not-applicable': {
    label: 'Not Applicable',
    countClass: 'bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-950',
    panelClass:
      'border-gray-300 bg-gray-50 dark:border-slate-600 dark:bg-slate-800/70',
  },
};

watchEffect(() => {
  statements.value = {};
  for (const statement of implementation?.statements || []) {
    statements.value[statement.statementId] = statement;
  }
});

function getLabel(part: Part): string {
  if (part.props) {
    for (const prop of part.props) {
      if (prop.name === 'label') {
        return prop.value ?? '';
      }
    }
  }
  return '';
}

function getText(_part: Part): string | null {
  const label = getLabel(_part);

  if (!label && !_part.prose) {
    return null;
  }

  return `${label ? label + ' ' : ''}${_part.prose ?? ''}`;
}

function onMouseOver(e: MouseEvent) {
  const { target } = e;
  if (target instanceof HTMLElement) {
    if (target.closest("*[data-type='part']") instanceof HTMLElement) {
      target.closest("*[data-type='part']")?.classList.add('hover');
    }
  }
}

function onMouseLeave(e: MouseEvent) {
  const { target } = e;
  if (target instanceof HTMLElement) {
    if (target.closest("*[data-type='part']") instanceof HTMLElement) {
      target.closest("*[data-type='part']")?.classList.remove('hover');
    }
  }
}

function onPartSelect(e: Event, part: Part) {
  e.preventDefault();
  void router.push({
    name: 'controls:detail',
    params: { controlId: control.id },
    query: { statementId: part.id },
  });
}

function statementStatusCue(part: Part): ImplementationStatusCue | null {
  const byComponents = statements.value[part.id]?.byComponents ?? [];
  if (byComponents.length === 0) {
    return null;
  }

  const states = byComponents.map((byComponent) =>
    byComponent.implementationStatus?.state?.trim().toLowerCase(),
  );
  const firstState = states[0];
  if (!firstState || !states.every((state) => state === firstState)) {
    return null;
  }

  return implementationStatusCues[firstState] ?? null;
}
</script>

<template>
  <div class="part-display">
    <div
      class="px-4 py-2 border-l-8 border-l-ccf-300 dark:border-l-slate-700 bg-ccf-200 dark:bg-slate-800 rounded-xl"
    >
      <PartDisplay
        v-for="part in control.parts?.filter(
          (part) => part.name == 'statement',
        ) || []"
        :key="part.id"
        :part="part"
        @mouseover="onMouseOver"
        @mouseout="onMouseLeave"
        @selected="onPartSelect"
      >
        <template #default="{ part }">
          <div
            class="rounded-md border p-2"
            :class="statementStatusCue(part)?.panelClass ?? neutralPanelClass"
          >
            <p v-if="getText(part)" class="prose prose-slate dark:prose-invert">
              {{ getText(part) ?? '' }}
            </p>
            <div
              v-if="statements[part.id]?.byComponents"
              class="mt-2 flex flex-wrap items-center gap-2"
            >
              <span
                class="rounded px-2 py-0.5 text-xs font-bold"
                :class="
                  statementStatusCue(part)?.countClass ?? neutralCountClass
                "
              >
                {{ statements[part.id].byComponents?.length }}
              </span>
              <span
                v-if="statementStatusCue(part)"
                class="rounded px-2 py-0.5 text-xs font-medium"
                :class="statementStatusCue(part)?.countClass"
              >
                {{ statementStatusCue(part)?.label }}
              </span>
            </div>
          </div>
        </template>
      </PartDisplay>
    </div>
  </div>
</template>

<style>
.part-display .hover {
  background-color: rgb(243 244 246);
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .part-display .hover {
    background-color: rgb(71 85 105);
  }
}
</style>
