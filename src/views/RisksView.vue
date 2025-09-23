<template>
  <div v-if="loading" class="text-center py-8">
    <p class="text-gray-500 dark:text-slate-400">Loading risks...</p>
  </div>

  <Message v-else-if="!poamDefined" severity="error" variant="outlined">
    <h4 class="font-bold">Plan Of Action and Milestones not selected</h4>
    <p>
      No Plan Of Action and Milestones (POA&M) has been selected for editing.
    </p>
    <p>
      Please return to the
      <RouterLink
        :to="{ name: 'plan-of-action-and-milestones' }"
        class="underline"
        >POA&M
      </RouterLink>
      to select one
    </p>
  </Message>

  <div v-else-if="error" class="text-center py-8">
    <p class="text-red-500">Error loading risks: {{ error }}</p>
  </div>

  <div v-else>
    <div class="flex items-center justfy-between mb-4">
      <div class="grow">
        <PageHeader>Risk Register</PageHeader>
        <PageSubHeader>Manage business and cyber risks centrally</PageSubHeader>
      </div>
      <Button @click="showCreateModal = true" size="small">Add Risk</Button>
    </div>

    <div v-if="!risks?.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No risks found.</p>
    </div>

    <div>
      <Panel v-for="risk in risks" :key="risk.uuid" class="mb-4">
        <template #header>
          <div class="grow flex items-center gap-2 text-lg">
            <h4 class="grow">{{ risk.title || 'Untitled Risk' }}</h4>

            <!-- <Badge value="AC-1" severity="info" /> -->
            <div class="flex">
              <Button @click="editRisk(risk)" variant="text" size="small">
                <BIconPencil />
              </Button>
              <Button
                v-if="risk.uuid"
                variant="text"
                size="small"
                @click="
                  confirmDeleteDialog(() => deleteRisk(risk.uuid!), {
                    itemType: 'risk',
                  })
                "
              >
                <BIconTrash />
              </Button>
              <Button
                v-if="risk.uuid"
                size="small"
                variant="outlined"
                @click="
                  router.push({
                    name: 'risks:detail',
                    params: { riskId: risk.uuid },
                  })
                "
              >
                Open
              </Button>
            </div>
          </div>
        </template>
        <div>
          <div v-if="risk.deadline" class="mb-2">
            <span>Deadline: </span>
            <span class="font-light">{{ formatDate(risk.deadline) }}</span>
          </div>

          <p class="font-light">
            {{ risk.description }}
          </p>

          <div v-if="risk.statement" class="mt-3">
            <h5 class="font-base">Statement</h5>
            <p class="font-light">
              {{ risk.statement }}
            </p>
          </div>

          <div class="mt-3">
            <h5>Status</h5>
            <Badge :value="risk.status" />
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <Badge
              v-if="risk.threatIds?.length"
              :value="`${risk.threatIds.length} Threats`"
            />
            <Badge
              v-if="risk.characterizations?.length"
              :value="`${risk.characterizations.length} Characterizations`"
              severity="success"
            />
            <Badge
              v-if="risk.mitigatingFactors?.length"
              :value="`${risk.mitigatingFactors.length} Mitigating Factors`"
              severity="info"
            />
            <Badge
              v-if="risk.remediations?.length"
              :value="`${risk.remediations.length} Remediations`"
              severity="warn"
            />
          </div>
        </div>
      </Panel>
    </div>
  </div>

  <!-- Create Modal -->
  <Dialog v-model:visible="showCreateModal" modal size="lg">
    <RiskCreateForm
      :poam-id="poamUuid"
      @cancel="showCreateModal = false"
      @created="handleRiskCreated"
    />
  </Dialog>

  <!-- Edit Modal -->
  <Dialog v-model:visible="showEditModal" modal size="lg">
    <RiskEditForm
      v-if="editingRisk"
      :poam-id="poamUuid"
      :risk="editingRisk"
      @cancel="showEditModal = false"
      @saved="handleRiskSaved"
    />
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { type Risk } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import RiskCreateForm from '@/components/poam/RiskCreateForm.vue';
import RiskEditForm from '@/components/poam/RiskEditForm.vue';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/components/PageHeader.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Button from '@/volt/Button.vue';
import Panel from '@/volt/Panel.vue';
import { useRouter } from 'vue-router';
import { BIconPencil, BIconTrash } from 'bootstrap-icons-vue';
import Badge from '@/volt/Badge.vue';

const toast = useToast();
const { system } = useSystemStore();
const router = useRouter();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const poamDefined = ref<boolean>(!!system.poam);
const poamUuid = computed(() => system.poam?.uuid ?? '');

const {
  data: risks,
  error,
  isLoading: loading,
  execute: loadRisks,
} = useDataApi<Risk[]>(
  `/api/oscal/plan-of-action-and-milestones/${system.poam?.uuid}/risks`,
  {},
  { immediate: false },
);

const handleRiskUpdated = (event: Event) => {
  const detail = (event as CustomEvent<{ risk: Risk; poamId?: string }>).detail;
  if (!detail?.risk?.uuid) return;
  if (detail.poamId && detail.poamId !== poamUuid.value) return;
  if (!risks.value) return;
  const index = risks.value.findIndex((item) => item.uuid === detail.risk.uuid);
  if (index !== -1) {
    risks.value[index] = detail.risk;
  }
};

onMounted(() => {
  if (system.poam) {
    loadRisks();
  }
  window.addEventListener('risk-updated', handleRiskUpdated as EventListener);
});

onUnmounted(() => {
  window.removeEventListener(
    'risk-updated',
    handleRiskUpdated as EventListener,
  );
});

const { execute: executeDeleteRisk } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

// Modal states
const showCreateModal = ref(false);
const showEditModal = ref(false);

// Edit targets
const editingRisk = ref<Risk | null>(null);

// Risk management
const editRisk = (risk: Risk) => {
  editingRisk.value = risk;
  showEditModal.value = true;
};

const handleRiskCreated = (newRisk: Risk) => {
  if (!risks.value) return;
  risks.value.push(newRisk);
  showCreateModal.value = false;
};

const handleRiskSaved = (updatedRisk: Risk) => {
  if (!risks.value || !updatedRisk) return;
  const index = risks.value.findIndex((risk) => risk.uuid === updatedRisk.uuid);
  if (index !== -1) {
    risks.value[index] = updatedRisk;
  }
  showEditModal.value = false;
  editingRisk.value = null;
};

const deleteRisk = async (uuid: string) => {
  try {
    if (!poamUuid.value) {
      throw new Error('No POA&M ID found.');
    }
    await executeDeleteRisk(
      `/api/oscal/plan-of-action-and-milestones/${poamUuid.value}/risks/${uuid}`,
    );
    toast.add({
      severity: 'success',
      summary: 'Risk Deleted',
      detail: 'Risk deleted successfully',
      life: 3000,
    });
    await loadRisks(); // Reload the list
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete risk: ${errorMessage}`,
      life: 5000,
    });
  }
};

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}
</script>
