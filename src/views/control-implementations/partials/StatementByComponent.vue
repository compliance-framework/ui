<script setup lang="ts">
import { ref, watchEffect, computed } from 'vue';
import { useSystemStore } from '@/stores/system.ts';
import BurgerMenu from '@/components/BurgerMenu.vue';
import Textarea from '@/volt/Textarea.vue';
import { useToggle } from '@/composables/useToggle';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import VueMarkdown from 'vue-markdown-render';
import type { ByComponent, SystemComponent } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import EvidenceAttachModal from '@/components/evidence/EvidenceAttachModal.vue';

const { byComponent } = defineProps<{
  byComponent: ByComponent;
}>();
const emit = defineEmits<{
  save: [byComponent: ByComponent];
  delete: [byComponent: ByComponent];
}>();

const { system } = useSystemStore();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const localComponent = ref<ByComponent>(byComponent);
watchEffect(() => {
  localComponent.value = byComponent;
});

const { value: editing, set: setEditing } = useToggle();

// Attach Evidence dialog state
const showAttachEvidence = ref(false);

const { data: component } = useDataApi<SystemComponent>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid as string}/system-implementation/components/${byComponent.componentUuid}`,
);

function save() {
  emit('save', localComponent.value);
  setEditing(false);
}

async function deleteStatement() {
  emit('delete', localComponent.value);
}

function cancel() {
  setEditing(false);
}

function openAttachEvidence() {
  showAttachEvidence.value = true;
}

function closeAttachEvidence() {
  showAttachEvidence.value = false;
}

function handleEvidenceSaved(updated: ByComponent) {
  // bubble up to parent save handler; parent persists via API
  emit('save', updated);
  closeAttachEvidence();
}

function extractEvidenceId(href?: string): string | null {
  if (!href) return null;
  try {
    const parts = href.split('/').filter(Boolean);
    const idx = parts.lastIndexOf('evidence');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
    return null;
  } catch {
    return null;
  }
}

const evidenceLinks = computed(() => {
  const links = localComponent.value.links || [];
  return links
    .filter((l) => l.rel === 'related-evidence' && l.href)
    .map((l) => {
      const id = extractEvidenceId(l.href);
      return id ? { id, text: l.text || id } : null;
    })
    .filter((x): x is { id: string; text: string } => !!x);
});
</script>

<template>
  <div class="flex justify-between items-center">
    <h4 class="font-medium">{{ component?.title }}</h4>
    <BurgerMenu
      :items="[
        {
          label: 'Edit',
          command() {
            setEditing(true);
          },
        },
        {
          label: 'Delete',
          command() {
            confirmDeleteDialog(() => deleteStatement(), {
              itemType: 'implementation statement',
            });
          },
        },
        {
          label: 'Link Evidence',
          command() {
            openAttachEvidence();
          },
        },
      ]"
    />
  </div>
  <div class="text-gray-600 dark:text-slate-400">
    <template v-if="!editing">
      <p class="prose prose-slate dark:prose-invert">
        <VueMarkdown :source="localComponent.description" />
      </p>
    </template>
    <template v-else>
      <Textarea
        v-model="localComponent.description"
        autoResize
        class="resize-none w-full"
        placeholder="Description"
        @keyup.ctrl.enter="save"
      />
      <div class="flex gap-x-2">
        <secondary-button @click="cancel">Cancel</secondary-button>
        <primary-button @click="save" v-tooltip="'ctrl + enter to save'"
          >Save</primary-button
        >
      </div>
    </template>
  </div>

  <!-- Export Information -->
  <div v-if="byComponent.export" class="mt-2 text-xs">
    <div v-if="byComponent.export.provided?.length" class="mb-1">
      <span class="font-medium text-green-700 dark:text-green-400"
        >Provided:</span
      >
      <div class="ml-2">
        <div
          v-for="provided in byComponent.export.provided"
          :key="provided.uuid"
          class="text-green-600 dark:text-green-400"
        >
          {{ provided.description }}
        </div>
      </div>
    </div>
    <div v-if="byComponent.export.responsibilities?.length" class="mb-1">
      <span class="font-medium text-orange-700 dark:text-orange-400"
        >Responsibilities:</span
      >
      <div class="ml-2">
        <div
          v-for="responsibility in byComponent.export.responsibilities"
          :key="responsibility.uuid"
          class="text-orange-600 dark:text-orange-400"
        >
          {{ responsibility.description }}
        </div>
      </div>
    </div>
  </div>

  <!-- Satisfied Requirements -->
  <div v-if="byComponent.satisfied?.length" class="mt-2 text-xs">
    <span class="font-medium text-blue-700 dark:text-blue-400">Satisfied:</span>
    <div class="ml-2">
      <div
        v-for="satisfied in byComponent.satisfied"
        :key="satisfied.uuid"
        class="text-blue-600 dark:text-blue-400"
      >
        {{ satisfied.description }}
      </div>
    </div>
  </div>

  <!-- Inherited Requirements -->
  <div v-if="byComponent.inherited?.length" class="mt-2 text-xs">
    <span class="font-medium text-purple-700 dark:text-purple-400"
      >Inherited:</span
    >
    <div class="ml-2">
      <div
        v-for="inherited in byComponent.inherited"
        :key="inherited.uuid"
        class="text-purple-600 dark:text-purple-400"
      >
        {{ inherited.description }}
      </div>
    </div>
  </div>

  <!-- Implementation Status -->
  <div v-if="byComponent.implementationStatus" class="mt-2 text-xs">
    <span class="font-medium text-purple-700 dark:text-purple-400"
      >Implementation Status:</span
    >
    <div class="ml-2">
      <span class="font-medium text-purple-700 dark:text-purple-400"
        >State: {{ byComponent.implementationStatus.state }}</span
      >
    </div>
    <div v-if="byComponent.implementationStatus.remarks">
      <div class="ml-2">
        <span class="font-medium text-purple-700 dark:text-purple-400"
          >Remarks: {{ byComponent.implementationStatus.remarks }}</span
        >
      </div>
    </div>
  </div>

  <!-- Linked Evidence -->
  <div v-if="evidenceLinks.length" class="mt-2 text-xs">
    <span class="font-medium text-indigo-700 dark:text-indigo-400"
      >Evidence ({{ evidenceLinks.length }}):</span
    >
    <div class="ml-2 flex flex-wrap gap-1 mt-1">
      <RouterLink
        v-for="ev in evidenceLinks"
        :key="ev.id"
        :to="{ name: 'evidence:view', params: { id: ev.id } }"
        class="inline-block bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 px-2 py-0.5 rounded hover:underline"
      >
        {{ ev.text }}
      </RouterLink>
    </div>
  </div>

  <!-- Attach Evidence Dialog -->
  <Dialog
    v-model:visible="showAttachEvidence"
    size="xl"
    modal
    header="Link Evidence"
  >
    <EvidenceAttachModal
      :by-component="localComponent"
      @cancel="closeAttachEvidence"
      @saved="handleEvidenceSaved"
    />
  </Dialog>
</template>
