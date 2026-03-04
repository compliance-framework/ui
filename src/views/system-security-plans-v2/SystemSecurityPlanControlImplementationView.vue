<template>
  <div class="space-y-6">
    <section
      v-if="loading"
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">Loading</p>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        Loading control implementation details...
      </p>
    </section>

    <section
      v-else-if="hasLoadError"
      class="border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-error)]">Load failed</p>
      <p class="mt-2 text-[var(--ui-v2-foreground)]">
        {{ errorMessage }}
      </p>
    </section>

    <section
      v-else-if="!ssp"
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-6"
    >
      <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">
        No plan found
      </p>
      <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
        This system security plan could not be loaded.
      </p>
    </section>

    <template v-else>
      <header>
        <p class="ui-v2-label mb-2 text-[var(--ui-v2-secondary-foreground)]">
          Controls
        </p>
        <h2 class="ui-v2-title text-[var(--ui-v2-foreground)]">
          Control Implementation
        </h2>
        <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
          Manage implemented requirements, statements, and by-component
          mappings.
        </p>
      </header>

      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            Control Implementation Overview
          </p>
          <button
            class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="!controlImplementation"
            @click="editControlImplementation"
          >
            Edit Overview
          </button>
        </div>

        <div v-if="controlImplementation" class="mt-4 space-y-4">
          <section
            class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
          >
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              Description
            </p>
            <p class="mt-2 text-[var(--ui-v2-foreground)]">
              {{
                controlImplementation.description ||
                'Add overview remarks to describe how requirements are implemented.'
              }}
            </p>
          </section>

          <div class="grid gap-4 md:grid-cols-3">
            <div
              class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            >
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                Implemented Requirements
              </p>
              <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
                {{ controlImplementation.implementedRequirements?.length || 0 }}
              </p>
            </div>
            <div
              class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            >
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                Total Statements
              </p>
              <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
                {{ totalStatements }}
              </p>
            </div>
            <div
              class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            >
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                Component Implementations
              </p>
              <p class="ui-v2-metric mt-2 text-[var(--ui-v2-foreground)]">
                {{ totalByComponents }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-else
          class="mt-4 border border-dashed border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
        >
          <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">
            No data
          </p>
          <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
            No control implementation overview is available yet.
          </p>
        </div>
      </section>

      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
            Implemented Requirements ({{ requirementCount }})
          </p>
          <button
            class="ui-v2-nav border border-[var(--ui-v2-success)] bg-[var(--ui-v2-success)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
            type="button"
            @click="addRequirement"
          >
            Add Requirement
          </button>
        </div>

        <div v-if="requirementCount" class="mt-4 space-y-4">
          <article
            v-for="requirement in controlImplementation?.implementedRequirements"
            :key="requirement.uuid"
            class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
                  {{ requirement.controlId || 'Untitled requirement' }}
                </p>
                <p class="mt-1 text-[var(--ui-v2-muted-foreground)]">
                  {{ requirement.remarks || 'No remarks provided.' }}
                </p>
              </div>

              <div
                class="ui-v2-label flex flex-wrap gap-3 text-[var(--ui-v2-info)]"
              >
                <button
                  type="button"
                  class="transition-colors hover:text-[var(--ui-v2-primary)]"
                  @click="createStatement(requirement)"
                >
                  Create Statement
                </button>
                <button
                  type="button"
                  class="transition-colors hover:text-[var(--ui-v2-primary)]"
                  @click="editRequirement(requirement)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="text-[var(--ui-v2-error)] transition-colors hover:opacity-80"
                  @click="
                    confirmDeleteDialog(() => deleteRequirement(requirement), {
                      itemName: requirement.controlId || 'Requirement',
                      itemType: 'requirement',
                    })
                  "
                >
                  Delete
                </button>
              </div>
            </div>

            <section
              v-if="requirement.statements?.length"
              class="mt-4 space-y-3"
            >
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                Statements ({{ requirement.statements.length }})
              </p>

              <article
                v-for="statement in requirement.statements"
                :key="statement.uuid"
                class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
                      {{ statement.statementId || 'Untitled statement' }}
                    </p>
                    <p class="mt-1 text-[var(--ui-v2-muted-foreground)]">
                      {{ statement.description || 'No description provided.' }}
                    </p>
                  </div>

                  <div class="ui-v2-label flex gap-3 text-[var(--ui-v2-info)]">
                    <button
                      type="button"
                      class="transition-colors hover:text-[var(--ui-v2-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled
                      @click="createComponent(statement)"
                    >
                      Create Component
                    </button>
                    <button
                      type="button"
                      class="transition-colors hover:text-[var(--ui-v2-primary)]"
                      @click="editStatement(requirement, statement)"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div
                  v-if="statement.byComponents?.length"
                  class="mt-3 space-y-2"
                >
                  <p class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
                    By Components
                  </p>
                  <div
                    v-for="byComponent in statement.byComponents"
                    :key="byComponent.uuid"
                    class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-2"
                  >
                    <StatementByComponent
                      :by-component="byComponent"
                      @save="
                        handleSaveStatementByComponent(
                          requirement,
                          statement,
                          $event,
                        )
                      "
                      @delete="
                        handleDeleteStatementByComponent(
                          requirement,
                          statement,
                          $event,
                        )
                      "
                    />
                  </div>
                </div>
              </article>
            </section>

            <section
              v-if="requirement.byComponents?.length"
              class="mt-4 space-y-2"
            >
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                Requirement Components ({{ requirement.byComponents.length }})
              </p>

              <article
                v-for="byComponent in requirement.byComponents"
                :key="byComponent.uuid"
                class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">
                      {{ byComponent.componentUuid || 'Unknown component' }}
                    </p>
                    <p class="mt-1 text-[var(--ui-v2-muted-foreground)]">
                      {{
                        byComponent.description || 'No description provided.'
                      }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="ui-v2-label text-[var(--ui-v2-info)] transition-colors hover:text-[var(--ui-v2-primary)]"
                    @click="
                      editRequirementByComponent(requirement, byComponent)
                    "
                  >
                    Edit
                  </button>
                </div>
              </article>
            </section>
          </article>
        </div>

        <div
          v-else
          class="mt-4 border border-dashed border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
        >
          <p class="ui-v2-nav text-[var(--ui-v2-secondary-foreground)]">
            No requirements
          </p>
          <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
            Add an implemented requirement to begin documenting controls.
          </p>
        </div>
      </section>

      <Dialog
        v-model:visible="showEditControlImplementationModal"
        size="lg"
        modal
        header="Edit Control Implementation"
      >
        <ControlImplementationEditForm
          v-if="controlImplementation"
          :ssp-id="sspId"
          :control-implementation="controlImplementation"
          @cancel="showEditControlImplementationModal = false"
          @saved="handleControlImplementationSaved"
        />
      </Dialog>

      <Dialog
        v-model:visible="showCreateRequirementModal"
        size="lg"
        modal
        header="Create Implemented Requirement"
      >
        <ImplementedRequirementCreateForm
          :ssp-id="sspId"
          @cancel="showCreateRequirementModal = false"
          @created="handleRequirementCreated"
        />
      </Dialog>

      <Dialog
        v-model:visible="showEditRequirementModal"
        size="lg"
        modal
        header="Edit Implemented Requirement"
      >
        <ImplementedRequirementEditForm
          v-if="editingRequirement"
          :ssp-id="sspId"
          :requirement="editingRequirement"
          @cancel="showEditRequirementModal = false"
          @saved="handleRequirementSaved"
        />
      </Dialog>

      <Dialog
        v-model:visible="showEditStatementModal"
        size="lg"
        modal
        header="Edit Statement"
      >
        <StatementEditForm
          v-if="editingStatement"
          :ssp-id="sspId"
          :req-id="editingRequirement?.uuid || ''"
          :statement="editingStatement"
          @cancel="showEditStatementModal = false"
          @saved="handleStatementSaved"
        />
      </Dialog>

      <Dialog
        v-model:visible="showCreateStatementModal"
        size="lg"
        modal
        header="Create New Statement"
      >
        <StatementCreateForm
          :ssp-id="sspId"
          :req-id="editingRequirement?.uuid || ''"
          @cancel="showCreateStatementModal = false"
          @created="handleStatementCreated"
        />
      </Dialog>

      <Dialog
        v-model:visible="showEditStatementByComponentModal"
        size="xl"
        modal
        header="Edit By-Component Implementation"
      >
        <ByComponentEditForm
          v-if="editingByComponent && editingRequirement && editingStatement"
          :ssp-id="sspId"
          :requirement="editingRequirement"
          :statement="editingStatement"
          :by-component="editingByComponent"
          @cancel="showEditStatementByComponentModal = false"
          @saved="handleStatementByComponentSaved"
        />
      </Dialog>

      <Dialog
        v-model:visible="showEditRequirementByComponentModal"
        size="xl"
        modal
        header="Edit Component Implementation"
      >
        <ByComponentEditForm
          v-if="editingByComponent && editingRequirement && !editingStatement"
          :ssp-id="sspId"
          :requirement="editingRequirement"
          :by-component="editingByComponent"
          @cancel="showEditRequirementByComponentModal = false"
          @saved="handleRequirementByComponentSaved"
        />
      </Dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type {
  ByComponent,
  ControlImplementation,
  ImplementedRequirement,
  Statement,
  SystemSecurityPlan,
} from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import ByComponentEditForm from '@/components/system-security-plans/ByComponentEditForm.vue';
import ControlImplementationEditForm from '@/components/system-security-plans/ControlImplementationEditForm.vue';
import ImplementedRequirementCreateForm from '@/components/system-security-plans/ImplementedRequirementCreateForm.vue';
import ImplementedRequirementEditForm from '@/components/system-security-plans/ImplementedRequirementEditForm.vue';
import StatementCreateForm from '@/components/system-security-plans/StatementCreateForm.vue';
import StatementEditForm from '@/components/system-security-plans/StatementEditForm.vue';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import StatementByComponent from '@/views/control-implementations/partials/StatementByComponent.vue';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { getIdFromRoute } from '@/utils/get-poam-id-from-route';

const route = useRoute();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const sspId = computed(() => getIdFromRoute(route));

const showCreateRequirementModal = ref(false);
const showEditRequirementModal = ref(false);
const showEditControlImplementationModal = ref(false);
const showEditStatementModal = ref(false);
const showCreateStatementModal = ref(false);
const showEditStatementByComponentModal = ref(false);
const showEditRequirementByComponentModal = ref(false);

const editingRequirement = ref<ImplementedRequirement | null>(null);
const editingStatement = ref<Statement | null>(null);
const editingByComponent = ref<ByComponent | null>(null);

const {
  data: ssp,
  isLoading: sspLoading,
  error: sspError,
} = useDataApi<SystemSecurityPlan>(
  `/api/oscal/system-security-plans/${route.params.id}`,
);

const {
  data: controlImplementation,
  isLoading: ciLoading,
  error: ciError,
} = useDataApi<ControlImplementation>(
  `/api/oscal/system-security-plans/${route.params.id}/control-implementation`,
);

const { execute: executeDelete } = useDataApi<void>(null, { method: 'DELETE' });
const { execute: executeUpdateByComponent } = useDataApi<ByComponent>(null, {
  method: 'PUT',
  transformRequest: [decamelizeKeys],
});

const loading = computed(() => sspLoading.value || ciLoading.value);
const hasLoadError = computed(() => Boolean(sspError.value || ciError.value));
const requirementCount = computed(
  () => controlImplementation.value?.implementedRequirements?.length || 0,
);

const errorMessage = computed(() => {
  const error = ciError.value || sspError.value;
  if (!error) {
    return 'Unable to load control implementation data.';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to load control implementation data.';
});

const totalStatements = computed(() => {
  if (!controlImplementation.value?.implementedRequirements) return 0;
  return controlImplementation.value.implementedRequirements.reduce(
    (total: number, req: ImplementedRequirement) => {
      return total + (req.statements?.length || 0);
    },
    0,
  );
});

const totalByComponents = computed(() => {
  if (!controlImplementation.value?.implementedRequirements) return 0;
  let total = 0;
  controlImplementation.value.implementedRequirements.forEach(
    (req: ImplementedRequirement) => {
      total += req.byComponents?.length || 0;
      if (req.statements) {
        req.statements.forEach((statement: Statement) => {
          total += statement.byComponents?.length || 0;
        });
      }
    },
  );
  return total;
});

const editControlImplementation = () => {
  showEditControlImplementationModal.value = true;
};

const handleControlImplementationSaved = (
  updatedControlImpl: ControlImplementation,
) => {
  controlImplementation.value = updatedControlImpl;
  showEditControlImplementationModal.value = false;
};

const addRequirement = () => {
  showCreateRequirementModal.value = true;
};

const editRequirement = (requirement: ImplementedRequirement) => {
  editingRequirement.value = requirement;
  showEditRequirementModal.value = true;
};

const deleteRequirement = async (requirement: ImplementedRequirement) => {
  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${route.params.id}/control-implementation/implemented-requirements/${requirement.uuid}`,
    );
    if (controlImplementation.value) {
      controlImplementation.value.implementedRequirements =
        controlImplementation.value.implementedRequirements.filter(
          (candidate) => candidate.uuid !== requirement.uuid,
        );
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Implemented requirement deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete implemented requirement:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete implemented requirement. Please try again.',
      life: 5000,
    });
  }
};

const handleRequirementCreated = (newRequirement: ImplementedRequirement) => {
  if (controlImplementation.value) {
    controlImplementation.value.implementedRequirements.push(newRequirement);
  }
  showCreateRequirementModal.value = false;
};

const handleRequirementSaved = (updatedRequirement: ImplementedRequirement) => {
  if (controlImplementation.value) {
    const index = controlImplementation.value.implementedRequirements.findIndex(
      (requirement) => requirement.uuid === updatedRequirement.uuid,
    );
    if (index !== -1) {
      controlImplementation.value.implementedRequirements[index] =
        updatedRequirement;
    }
  }
  showEditRequirementModal.value = false;
  editingRequirement.value = null;
};

const handleStatementSaved = (updatedStatement: Statement) => {
  if (controlImplementation.value && editingRequirement.value) {
    const reqIndex =
      controlImplementation.value.implementedRequirements.findIndex(
        (requirement) => requirement.uuid === editingRequirement.value?.uuid,
      );
    if (reqIndex !== -1) {
      const requirement =
        controlImplementation.value.implementedRequirements[reqIndex];
      if (requirement.statements) {
        const statementIndex = requirement.statements.findIndex(
          (statement) => statement.uuid === updatedStatement.uuid,
        );
        if (statementIndex !== -1) {
          requirement.statements[statementIndex] = updatedStatement;
        }
      }
    }
  }
  showEditStatementModal.value = false;
  editingStatement.value = null;
  editingRequirement.value = null;
};

const handleStatementCreated = (newStatement: Statement) => {
  if (controlImplementation.value && editingRequirement.value) {
    const reqIndex =
      controlImplementation.value.implementedRequirements.findIndex(
        (requirement) => requirement.uuid === editingRequirement.value?.uuid,
      );
    if (reqIndex !== -1) {
      const requirement =
        controlImplementation.value.implementedRequirements[reqIndex];
      if (!requirement.statements) {
        requirement.statements = [];
      }
      requirement.statements.push(newStatement);
    }
  }
  showCreateStatementModal.value = false;
  editingRequirement.value = null;
};

const editStatement = (
  requirement: ImplementedRequirement,
  statement: Statement,
) => {
  editingRequirement.value = requirement;
  editingStatement.value = statement;
  showEditStatementModal.value = true;
};

const createStatement = (requirement: ImplementedRequirement) => {
  editingRequirement.value = requirement;
  showCreateStatementModal.value = true;
};

const createComponent = (statement: Statement) => {
  console.log('Create Component for Statement:', statement);
  alert('Create Component functionality is in development');
};

const handleStatementByComponentSaved = (updatedByComponent: ByComponent) => {
  if (
    controlImplementation.value &&
    editingRequirement.value &&
    editingStatement.value
  ) {
    const reqIndex =
      controlImplementation.value.implementedRequirements.findIndex(
        (requirement) => requirement.uuid === editingRequirement.value?.uuid,
      );
    if (reqIndex !== -1) {
      const requirement =
        controlImplementation.value.implementedRequirements[reqIndex];
      if (requirement.statements) {
        const statementIndex = requirement.statements.findIndex(
          (statement) => statement.uuid === editingStatement.value?.uuid,
        );
        if (statementIndex !== -1) {
          const statement = requirement.statements[statementIndex];
          if (statement.byComponents) {
            const byCompIndex = statement.byComponents.findIndex(
              (byComponent) => byComponent.uuid === updatedByComponent.uuid,
            );
            if (byCompIndex !== -1) {
              statement.byComponents[byCompIndex] = updatedByComponent;
            }
          }
        }
      }
    }
  }
  showEditStatementByComponentModal.value = false;
  editingByComponent.value = null;
  editingStatement.value = null;
  editingRequirement.value = null;
};

const handleRequirementByComponentSaved = (updatedByComponent: ByComponent) => {
  if (controlImplementation.value && editingRequirement.value) {
    const reqIndex =
      controlImplementation.value.implementedRequirements.findIndex(
        (requirement) => requirement.uuid === editingRequirement.value?.uuid,
      );
    if (reqIndex !== -1) {
      const requirement =
        controlImplementation.value.implementedRequirements[reqIndex];
      if (requirement.byComponents) {
        const byCompIndex = requirement.byComponents.findIndex(
          (byComponent) => byComponent.uuid === updatedByComponent.uuid,
        );
        if (byCompIndex !== -1) {
          requirement.byComponents[byCompIndex] = updatedByComponent;
        }
      }
    }
  }
  showEditRequirementByComponentModal.value = false;
  editingByComponent.value = null;
  editingRequirement.value = null;
  editingStatement.value = null;
};

const editRequirementByComponent = (
  requirement: ImplementedRequirement,
  byComponent: ByComponent,
) => {
  editingRequirement.value = requirement;
  editingByComponent.value = byComponent;
  editingStatement.value = null;
  showEditRequirementByComponentModal.value = true;
};

const handleSaveStatementByComponent = async (
  requirement: ImplementedRequirement,
  statement: Statement,
  updatedByComponent: ByComponent,
) => {
  try {
    if (!sspId.value) {
      toast.add({
        severity: 'error',
        summary: 'Missing System Plan',
        detail: 'Unable to determine which system security plan to update.',
        life: 4000,
      });
      return;
    }
    const response = await executeUpdateByComponent(
      `/api/oscal/system-security-plans/${sspId.value}/control-implementation/implemented-requirements/${requirement.uuid}/statements/${statement.uuid}/by-components/${updatedByComponent.uuid}`,
      {
        data: updatedByComponent,
      },
    );
    const persistedByComponent =
      response.data.value?.data ?? updatedByComponent;
    if (controlImplementation.value) {
      const reqIndex =
        controlImplementation.value.implementedRequirements.findIndex(
          (candidate) => candidate.uuid === requirement.uuid,
        );
      if (reqIndex !== -1) {
        const currentRequirement =
          controlImplementation.value.implementedRequirements[reqIndex];
        if (currentRequirement.statements) {
          const statementIndex = currentRequirement.statements.findIndex(
            (candidate) => candidate.uuid === statement.uuid,
          );
          if (statementIndex !== -1) {
            const currentStatement =
              currentRequirement.statements[statementIndex];
            if (currentStatement.byComponents) {
              const byCompIndex = currentStatement.byComponents.findIndex(
                (candidate) => candidate.uuid === updatedByComponent.uuid,
              );
              if (byCompIndex !== -1) {
                currentStatement.byComponents[byCompIndex] =
                  persistedByComponent;
              }
            }
          }
        }
      }
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Statement by-component updated successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to save statement by-component:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save statement by-component. Please try again.',
      life: 5000,
    });
  }
};

const handleDeleteStatementByComponent = async (
  requirement: ImplementedRequirement,
  statement: Statement,
  byComponentToDelete: ByComponent,
) => {
  try {
    if (!sspId.value) {
      toast.add({
        severity: 'error',
        summary: 'Missing System Plan',
        detail: 'Unable to determine which system security plan to update.',
        life: 4000,
      });
      return;
    }
    await executeDelete(
      `/api/oscal/system-security-plans/${sspId.value}/control-implementation/implemented-requirements/${requirement.uuid}/statements/${statement.uuid}/by-components/${byComponentToDelete.uuid}`,
    );
    if (controlImplementation.value) {
      const reqIndex =
        controlImplementation.value.implementedRequirements.findIndex(
          (candidate) => candidate.uuid === requirement.uuid,
        );
      if (reqIndex !== -1) {
        const currentRequirement =
          controlImplementation.value.implementedRequirements[reqIndex];
        if (currentRequirement.statements) {
          const statementIndex = currentRequirement.statements.findIndex(
            (candidate) => candidate.uuid === statement.uuid,
          );
          if (statementIndex !== -1) {
            const currentStatement =
              currentRequirement.statements[statementIndex];
            if (currentStatement.byComponents) {
              currentStatement.byComponents =
                currentStatement.byComponents.filter(
                  (candidate) => candidate.uuid !== byComponentToDelete.uuid,
                );
            }
          }
        }
      }
    }
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Statement by-component deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete statement by-component:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete statement by-component. Please try again.',
      life: 5000,
    });
  }
};
</script>
