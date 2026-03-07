<template>
  <div class="space-y-4">
    <section
      class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p
          class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
        >
          CONTROL IMPLEMENTATION
        </p>
        <SecondaryButton
          type="button"
          size="small"
          :disabled="!controlImplementation"
          @click="editControlImplementation"
        >
          EDIT
        </SecondaryButton>
      </div>

      <div
        v-if="isControlImplementationLoading"
        class="mt-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
      >
        <p
          class="ui-v2-nav text-[11px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
        >
          Loading control implementation...
        </p>
      </div>

      <div
        v-else-if="controlImplementationErrorMessage"
        class="mt-3 border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] p-3"
      >
        <p class="ui-v2-nav text-[11px] font-bold text-[var(--ui-v2-error)]">
          Error loading control implementation.
        </p>
        <p class="mt-1 text-[var(--ui-v2-foreground)]">
          {{ controlImplementationErrorMessage }}
        </p>
      </div>

      <div
        v-else-if="!controlImplementation"
        class="mt-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
      >
        <p
          class="ui-v2-nav text-[11px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
        >
          No control implementation information available.
        </p>
      </div>

      <template v-else>
        <p class="ui-v2-label mt-3 text-[var(--ui-v2-secondary-foreground)]">
          DESCRIPTION
        </p>
        <p
          class="mt-1 font-[var(--ui-v2-font-secondary)] text-[12px] font-semibold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
        >
          {{
            controlImplementation.description ||
            'Access control implementation narrative with requirement-level and component-level mappings.'
          }}
        </p>

        <div class="mt-3 grid gap-3 md:grid-cols-3">
          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p
              class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
            >
              IMPLEMENTED REQUIREMENTS
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-info)]">
              {{ requirementCount }}
            </p>
          </article>

          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p
              class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
            >
              TOTAL STATEMENTS
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-success)]">
              {{ totalStatements }}
            </p>
          </article>

          <article
            class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <p
              class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
            >
              COMPONENT IMPLEMENTATIONS
            </p>
            <p class="ui-v2-metric text-[var(--ui-v2-primary)]">
              {{ totalByComponents }}
            </p>
          </article>
        </div>
      </template>
    </section>

    <template
      v-if="
        !isControlImplementationLoading &&
        !controlImplementationErrorMessage &&
        controlImplementation
      "
    >
      <section
        v-if="requirementCount === 0"
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p
            class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
          >
            IMPLEMENTED REQUIREMENTS (0)
          </p>
          <PrimaryButton type="button" @click="addRequirement">
            ADD REQUIREMENT
          </PrimaryButton>
        </div>

        <div
          class="mt-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
        >
          <p
            class="ui-v2-nav text-[11px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
          >
            No implemented requirements yet. Click "Add Requirement" to get
            started.
          </p>
        </div>
      </section>

      <section
        v-else
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
      >
        <div class="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
          <aside
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4 xl:sticky xl:top-24 xl:flex xl:max-h-[calc(100dvh-128px)] xl:flex-col xl:overflow-hidden"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2">
                <p
                  class="min-w-[120px] text-[14px] font-bold tracking-[0.3px] text-[var(--ui-v2-foreground)]"
                >
                  REQUIREMENTS
                </p>
                <span
                  class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1.5 py-[2px] font-[var(--ui-v2-font-secondary)] text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-foreground)]"
                >
                  {{ requirementCount }}
                </span>
              </div>

              <PrimaryButton type="button" size="small" @click="addRequirement">
                ADD REQUIREMENT
              </PrimaryButton>
            </div>

            <div
              class="requirements-scroll space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-1"
            >
              <button
                v-for="requirement in requirements"
                :key="requirement.uuid"
                type="button"
                class="w-full border p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ui-v2-primary)]"
                :class="
                  selectedRequirement?.uuid === requirement.uuid
                    ? 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)]'
                    : 'border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] hover:bg-[var(--ui-v2-primary-tint-10)]'
                "
                @click="selectRequirement(requirement)"
              >
                <div class="flex items-center justify-between gap-2">
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-extrabold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ requirement.controlId || 'UNSPECIFIED' }}
                  </p>

                  <div class="flex items-center gap-1.5">
                    <span
                      class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-1.5 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      STMTS {{ getRequirementStatementCount(requirement) }}
                    </span>
                    <span
                      class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-1.5 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      REQ COMP {{ getRequirementByComponentCount(requirement) }}
                    </span>
                  </div>
                </div>

                <p
                  v-if="requirement.remarks"
                  class="mt-1 truncate font-[var(--ui-v2-font-secondary)] text-[10px] font-medium tracking-[0.8px] text-[var(--ui-v2-muted-foreground)]"
                  :title="requirement.remarks"
                >
                  {{ requirement.remarks }}
                </p>
              </button>
            </div>
          </aside>

          <section
            v-if="selectedRequirement"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4"
          >
            <div
              class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"
            >
              <div class="min-w-0 xl:flex-1 xl:pr-4">
                <p
                  class="ui-v2-nav text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                >
                  {{ selectedRequirementControlId }}
                </p>
                <p
                  class="mt-1 break-words font-[var(--ui-v2-font-primary)] text-[22px] font-bold leading-tight tracking-[0.3px] text-[var(--ui-v2-foreground)]"
                  :title="selectedRequirementTitle"
                >
                  {{ selectedRequirementTitle }}
                </p>
                <p
                  class="ui-v2-nav mt-1 text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  :title="selectedRequirement.uuid"
                >
                  UUID: {{ formatCompactUuid(selectedRequirement.uuid) }}
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-3">
                <div class="flex shrink-0 items-center gap-2">
                  <PrimaryButton
                    type="button"
                    size="small"
                    :disabled="!selectedRequirement"
                    @click="createStatement(selectedRequirement)"
                  >
                    CREATE STATEMENT
                  </PrimaryButton>
                  <SecondaryButton
                    type="button"
                    size="small"
                    :disabled="!selectedRequirement"
                    @click="editRequirement(selectedRequirement)"
                  >
                    EDIT
                  </SecondaryButton>
                </div>

                <DangerButton
                  type="button"
                  size="small"
                  :disabled="!selectedRequirement"
                  @click="confirmDeleteRequirement(selectedRequirement)"
                >
                  DELETE
                </DangerButton>
              </div>
            </div>

            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              REMARKS
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
            >
              {{
                selectedRequirement.remarks ||
                'No remarks are currently recorded for this requirement.'
              }}
            </p>

            <div
              class="flex h-10 overflow-x-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
            >
              <button
                v-for="tab in inspectorTabItems"
                :key="tab.key"
                type="button"
                class="group flex min-w-[132px] flex-1 flex-col border-r border-[var(--ui-v2-border)] last:border-r-0"
                :class="
                  inspectorTab === tab.key
                    ? 'bg-[var(--ui-v2-primary-tint-15)]'
                    : 'bg-[var(--ui-v2-surface)]'
                "
                @click="inspectorTab = tab.key"
              >
                <span
                  class="ui-v2-nav flex h-full items-center justify-center px-2 py-2.5 text-[9px] font-bold tracking-[1px]"
                  :class="
                    inspectorTab === tab.key
                      ? 'text-[var(--ui-v2-foreground)]'
                      : 'text-[var(--ui-v2-secondary-foreground)]'
                  "
                >
                  {{ tab.label }}
                </span>
                <span
                  class="w-full"
                  :class="
                    inspectorTab === tab.key
                      ? 'h-[3px] bg-[var(--ui-v2-primary)]'
                      : 'h-px bg-[var(--ui-v2-border)]'
                  "
                />
              </button>
            </div>

            <section v-if="inspectorTab === 'statements'" class="space-y-3">
              <p
                class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
              >
                STATEMENTS ({{ selectedRequirementStatementCount }})
              </p>

              <div
                v-if="selectedRequirementStatementCount === 0"
                class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
              >
                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                >
                  No statements are defined for this requirement.
                </p>
              </div>

              <article
                v-for="statement in selectedRequirement.statements || []"
                :key="statement.uuid"
                class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[12px] font-extrabold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ statement.statementId || 'UNSPECIFIED STATEMENT' }}
                  </p>

                  <div class="flex items-center gap-2">
                    <PrimaryButton
                      type="button"
                      size="small"
                      @click="
                        createStatementByComponent(
                          selectedRequirement,
                          statement,
                        )
                      "
                    >
                      CREATE COMPONENT
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      size="small"
                      @click="editStatement(selectedRequirement, statement)"
                    >
                      EDIT
                    </SecondaryButton>
                  </div>
                </div>

                <section
                  class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-2.5 py-2"
                >
                  <p
                    class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    DESCRIPTION
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{
                      resolveStatementDescription(
                        selectedRequirement,
                        statement,
                      )
                    }}
                  </p>
                </section>

                <section
                  class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-2.5 py-2"
                >
                  <p
                    class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    REMARKS
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ statement.remarks || 'No statement remarks provided.' }}
                  </p>
                </section>

                <section
                  class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-2.5 py-2"
                >
                  <p
                    class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    RESPONSIBLE ROLES
                  </p>

                  <div
                    v-if="statement.responsibleRoles?.length"
                    class="space-y-1"
                  >
                    <div
                      v-for="(role, roleIndex) in statement.responsibleRoles"
                      :key="`${statement.uuid}-statement-role-${roleIndex}`"
                      class="flex flex-wrap items-center gap-1.5"
                    >
                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold text-[var(--ui-v2-foreground)]"
                      >
                        {{ formatRoleLabel(role) }}
                      </p>
                      <span
                        v-if="getRolePartyTagText(role)"
                        class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                      >
                        {{ getRolePartyTagText(role) }}
                      </span>
                    </div>
                  </div>

                  <p
                    v-else
                    class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                  >
                    No responsible roles defined.
                  </p>
                </section>

                <div class="h-px w-full bg-[var(--ui-v2-border)]" />

                <p
                  class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                >
                  STATEMENT COMPONENTS ({{
                    statement.byComponents?.length || 0
                  }})
                </p>

                <div v-if="statement.byComponents?.length" class="space-y-2.5">
                  <article
                    v-for="byComponent in statement.byComponents"
                    :key="byComponent.uuid"
                    class="space-y-2.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-2.5"
                  >
                    <div
                      class="flex flex-wrap items-start justify-between gap-2"
                    >
                      <div class="min-w-0">
                        <p
                          class="truncate font-[var(--ui-v2-font-secondary)] text-[11px] font-extrabold tracking-[1px] text-[var(--ui-v2-foreground)]"
                          :title="getByComponentDisplayTitle(byComponent)"
                        >
                          {{ getByComponentDisplayTitle(byComponent) }}
                        </p>
                        <p
                          class="ui-v2-meta text-[9px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                          :title="byComponent.componentUuid"
                        >
                          componentUuid:
                          {{ formatCompactUuid(byComponent.componentUuid) }}
                        </p>
                      </div>

                      <div class="flex items-center gap-2">
                        <span
                          class="inline-flex items-center justify-center border px-1.5 py-[2px] font-[var(--ui-v2-font-secondary)] text-[9px] font-extrabold tracking-[1px]"
                          :class="
                            getImplementationStateBadgeClass(
                              byComponent.implementationStatus?.state,
                            )
                          "
                        >
                          {{
                            getImplementationStateBadgeLabel(
                              byComponent.implementationStatus?.state,
                            )
                          }}
                        </span>
                        <SecondaryButton
                          type="button"
                          size="small"
                          @click="
                            editStatementByComponent(
                              selectedRequirement,
                              statement,
                              byComponent,
                            )
                          "
                        >
                          EDIT
                        </SecondaryButton>
                        <DangerButton
                          type="button"
                          size="small"
                          @click="
                            confirmDeleteStatementByComponent(
                              selectedRequirement,
                              statement,
                              byComponent,
                            )
                          "
                        >
                          DELETE
                        </DangerButton>
                      </div>
                    </div>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
                    >
                      {{
                        byComponent.description ||
                        'No by-component description provided.'
                      }}
                    </p>

                    <div class="grid gap-2 md:grid-cols-2">
                      <section
                        class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                      >
                        <p
                          class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                        >
                          EXPORT
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          Description
                        </p>
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          {{
                            byComponent.export?.description ||
                            'No export description provided.'
                          }}
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Provided
                        </p>
                        <div
                          v-if="byComponent.export?.provided?.length"
                          class="space-y-1"
                        >
                          <div
                            v-for="provided in byComponent.export.provided"
                            :key="provided.uuid"
                            class="flex flex-wrap items-center gap-1.5"
                          >
                            <p
                              class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                            >
                              - {{ provided.description || 'No description' }}
                            </p>
                            <span
                              class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                            >
                              uuid: {{ formatShortToken(provided.uuid) }}
                            </span>
                          </div>
                        </div>
                        <p
                          v-else
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                        >
                          None
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Responsibilities
                        </p>
                        <div
                          v-if="byComponent.export?.responsibilities?.length"
                          class="space-y-1"
                        >
                          <div
                            v-for="responsibility in byComponent.export
                              .responsibilities"
                            :key="responsibility.uuid"
                            class="flex flex-wrap items-center gap-1.5"
                          >
                            <p
                              class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                            >
                              -
                              {{
                                responsibility.description || 'No description'
                              }}
                            </p>
                            <span
                              class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                            >
                              {{
                                responsibility.providedUuid
                                  ? `links -> provided ${formatShortToken(
                                      responsibility.providedUuid,
                                    )}`
                                  : `uuid: ${formatShortToken(
                                      responsibility.uuid,
                                    )}`
                              }}
                            </span>
                          </div>
                        </div>
                        <p
                          v-else
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                        >
                          None
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Remarks
                        </p>
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          {{
                            byComponent.export?.remarks ||
                            'No export remarks provided.'
                          }}
                        </p>
                      </section>

                      <section
                        class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                      >
                        <p
                          class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                        >
                          SATISFIED / INHERITED
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Satisfied
                        </p>
                        <div
                          v-if="byComponent.satisfied?.length"
                          class="space-y-1"
                        >
                          <div
                            v-for="satisfied in byComponent.satisfied"
                            :key="satisfied.uuid"
                            class="flex flex-wrap items-center gap-1.5"
                          >
                            <p
                              class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                            >
                              - {{ satisfied.description || 'No description' }}
                            </p>
                            <span
                              v-if="satisfied.responsibilityUuid"
                              class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                            >
                              links -> responsibility
                              {{
                                formatShortToken(satisfied.responsibilityUuid)
                              }}
                            </span>
                          </div>
                        </div>
                        <p
                          v-else
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                        >
                          None
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Inherited
                        </p>
                        <div
                          v-if="byComponent.inherited?.length"
                          class="space-y-1"
                        >
                          <div
                            v-for="inherited in byComponent.inherited"
                            :key="inherited.uuid"
                            class="flex flex-wrap items-center gap-1.5"
                          >
                            <p
                              class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                            >
                              - {{ inherited.description || 'No description' }}
                            </p>
                            <span
                              v-if="inherited.providedUuid"
                              class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                            >
                              links -> provided
                              {{ formatShortToken(inherited.providedUuid) }}
                            </span>
                          </div>
                        </div>
                        <p
                          v-else
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                        >
                          None
                        </p>
                      </section>

                      <section
                        class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                      >
                        <p
                          class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                        >
                          STATUS &amp; PARAMETERS
                        </p>

                        <div class="flex flex-wrap items-center gap-1.5">
                          <p
                            class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                          >
                            State
                          </p>
                          <span
                            class="inline-flex items-center justify-center border px-1.5 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold"
                            :class="
                              getImplementationStateBadgeClass(
                                byComponent.implementationStatus?.state,
                              )
                            "
                          >
                            {{
                              getImplementationStateBadgeLabel(
                                byComponent.implementationStatus?.state,
                              )
                            }}
                          </span>
                        </div>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Remarks
                        </p>
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          {{
                            byComponent.implementationStatus?.remarks ||
                            byComponent.remarks ||
                            'No status remarks provided.'
                          }}
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Set Parameters
                        </p>

                        <div
                          v-if="byComponent.setParameters?.length"
                          class="space-y-1"
                        >
                          <div
                            v-for="(
                              parameter, parameterIndex
                            ) in byComponent.setParameters"
                            :key="`${byComponent.uuid}-statement-param-${parameterIndex}`"
                            class="flex flex-wrap items-center gap-1.5"
                          >
                            <p
                              class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                            >
                              {{ parameter.paramId || 'unnamed-parameter' }}
                            </p>
                            <span
                              v-for="(value, valueIndex) in parameter.values ||
                              []"
                              :key="`${byComponent.uuid}-statement-param-${parameterIndex}-${valueIndex}`"
                              class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1.5 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-foreground)]"
                            >
                              {{ value }}
                            </span>
                          </div>
                        </div>

                        <p
                          v-else
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                        >
                          None
                        </p>
                      </section>

                      <section
                        class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                      >
                        <p
                          class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                        >
                          ROLES &amp; METADATA
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Roles
                        </p>
                        <div
                          v-if="byComponent.responsibleRoles?.length"
                          class="space-y-1"
                        >
                          <div
                            v-for="(
                              role, roleIndex
                            ) in byComponent.responsibleRoles"
                            :key="`${byComponent.uuid}-statement-by-component-role-${roleIndex}`"
                            class="flex flex-wrap items-center gap-1.5"
                          >
                            <p
                              class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                            >
                              {{ formatRoleLabel(role) }}
                            </p>
                            <span
                              v-if="getRolePartyTagText(role)"
                              class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                            >
                              {{ getRolePartyTagText(role) }}
                            </span>
                          </div>
                        </div>
                        <p
                          v-else
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                        >
                          None
                        </p>

                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          Metadata
                        </p>
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          Props: {{ summarizeProps(byComponent.props) }}
                        </p>
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          Links:
                        </p>
                        <div class="space-y-0.5">
                          <template v-if="byComponent.links?.length">
                            <a
                              v-for="(link, linkIndex) in byComponent.links"
                              :key="`${byComponent.uuid}-statement-link-${linkIndex}`"
                              class="ui-v2-link block break-all font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold"
                              :href="link.href"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {{ link.href || link.text || 'link' }}
                            </a>
                          </template>
                          <p
                            v-else
                            class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                          >
                            none
                          </p>
                        </div>
                      </section>
                    </div>
                  </article>
                </div>

                <p
                  v-else
                  class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                >
                  No by-component implementations for this statement.
                </p>
              </article>
            </section>

            <section
              v-else-if="inspectorTab === 'requirement-components'"
              class="space-y-3"
            >
              <p
                class="ui-v2-label text-[11px] text-[var(--ui-v2-secondary-foreground)]"
              >
                REQUIREMENT COMPONENTS ({{ selectedRequirementComponentCount }})
              </p>

              <div
                v-if="selectedRequirementComponentCount === 0"
                class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
              >
                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                >
                  No requirement-level component implementations are defined.
                </p>
              </div>

              <article
                v-for="byComponent in selectedRequirement.byComponents || []"
                :key="byComponent.uuid"
                class="space-y-2.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-2.5"
              >
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p
                      class="truncate font-[var(--ui-v2-font-secondary)] text-[11px] font-extrabold tracking-[1px] text-[var(--ui-v2-foreground)]"
                      :title="getByComponentDisplayTitle(byComponent)"
                    >
                      {{ getByComponentDisplayTitle(byComponent) }}
                    </p>
                    <p
                      class="ui-v2-meta text-[9px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                      :title="byComponent.componentUuid"
                    >
                      componentUuid:
                      {{ formatCompactUuid(byComponent.componentUuid) }}
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex items-center justify-center border px-1.5 py-[2px] font-[var(--ui-v2-font-secondary)] text-[9px] font-extrabold tracking-[1px]"
                      :class="
                        getImplementationStateBadgeClass(
                          byComponent.implementationStatus?.state,
                        )
                      "
                    >
                      {{
                        getImplementationStateBadgeLabel(
                          byComponent.implementationStatus?.state,
                        )
                      }}
                    </span>
                    <SecondaryButton
                      type="button"
                      size="small"
                      @click="
                        editRequirementByComponent(
                          selectedRequirement,
                          byComponent,
                        )
                      "
                    >
                      EDIT
                    </SecondaryButton>
                  </div>
                </div>

                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
                >
                  {{
                    byComponent.description ||
                    'No by-component description provided.'
                  }}
                </p>

                <div class="grid gap-2 md:grid-cols-2">
                  <section
                    class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                  >
                    <p
                      class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      EXPORT
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Description
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                    >
                      {{
                        byComponent.export?.description ||
                        'No export description provided.'
                      }}
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Provided
                    </p>
                    <div
                      v-if="byComponent.export?.provided?.length"
                      class="space-y-1"
                    >
                      <div
                        v-for="provided in byComponent.export.provided"
                        :key="provided.uuid"
                        class="flex flex-wrap items-center gap-1.5"
                      >
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          - {{ provided.description || 'No description' }}
                        </p>
                        <span
                          class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          uuid: {{ formatShortToken(provided.uuid) }}
                        </span>
                      </div>
                    </div>
                    <p
                      v-else
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      None
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Responsibilities
                    </p>
                    <div
                      v-if="byComponent.export?.responsibilities?.length"
                      class="space-y-1"
                    >
                      <div
                        v-for="responsibility in byComponent.export
                          .responsibilities"
                        :key="responsibility.uuid"
                        class="flex flex-wrap items-center gap-1.5"
                      >
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          - {{ responsibility.description || 'No description' }}
                        </p>
                        <span
                          class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          {{
                            responsibility.providedUuid
                              ? `links -> provided ${formatShortToken(
                                  responsibility.providedUuid,
                                )}`
                              : `uuid: ${formatShortToken(responsibility.uuid)}`
                          }}
                        </span>
                      </div>
                    </div>
                    <p
                      v-else
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      None
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Remarks
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                    >
                      {{
                        byComponent.export?.remarks ||
                        'No export remarks provided.'
                      }}
                    </p>
                  </section>

                  <section
                    class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                  >
                    <p
                      class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      SATISFIED / INHERITED
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Satisfied
                    </p>
                    <div v-if="byComponent.satisfied?.length" class="space-y-1">
                      <div
                        v-for="satisfied in byComponent.satisfied"
                        :key="satisfied.uuid"
                        class="flex flex-wrap items-center gap-1.5"
                      >
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          - {{ satisfied.description || 'No description' }}
                        </p>
                        <span
                          v-if="satisfied.responsibilityUuid"
                          class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          links -> responsibility
                          {{ formatShortToken(satisfied.responsibilityUuid) }}
                        </span>
                      </div>
                    </div>
                    <p
                      v-else
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      None
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Inherited
                    </p>
                    <div v-if="byComponent.inherited?.length" class="space-y-1">
                      <div
                        v-for="inherited in byComponent.inherited"
                        :key="inherited.uuid"
                        class="flex flex-wrap items-center gap-1.5"
                      >
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          - {{ inherited.description || 'No description' }}
                        </p>
                        <span
                          v-if="inherited.providedUuid"
                          class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          links -> provided
                          {{ formatShortToken(inherited.providedUuid) }}
                        </span>
                      </div>
                    </div>
                    <p
                      v-else
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      None
                    </p>
                  </section>

                  <section
                    class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                  >
                    <p
                      class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      STATUS &amp; PARAMETERS
                    </p>

                    <div class="flex flex-wrap items-center gap-1.5">
                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                      >
                        State
                      </p>
                      <span
                        class="inline-flex items-center justify-center border px-1.5 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold"
                        :class="
                          getImplementationStateBadgeClass(
                            byComponent.implementationStatus?.state,
                          )
                        "
                      >
                        {{
                          getImplementationStateBadgeLabel(
                            byComponent.implementationStatus?.state,
                          )
                        }}
                      </span>
                    </div>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Remarks
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                    >
                      {{
                        byComponent.implementationStatus?.remarks ||
                        byComponent.remarks ||
                        'No status remarks provided.'
                      }}
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Set Parameters
                    </p>

                    <div
                      v-if="byComponent.setParameters?.length"
                      class="space-y-1"
                    >
                      <div
                        v-for="(
                          parameter, parameterIndex
                        ) in byComponent.setParameters"
                        :key="`${byComponent.uuid}-req-param-${parameterIndex}`"
                        class="flex flex-wrap items-center gap-1.5"
                      >
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          {{ parameter.paramId || 'unnamed-parameter' }}
                        </p>
                        <span
                          v-for="(value, valueIndex) in parameter.values || []"
                          :key="`${byComponent.uuid}-req-param-${parameterIndex}-${valueIndex}`"
                          class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1.5 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-foreground)]"
                        >
                          {{ value }}
                        </span>
                      </div>
                    </div>

                    <p
                      v-else
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      None
                    </p>
                  </section>

                  <section
                    class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-2"
                  >
                    <p
                      class="ui-v2-meta text-[9px] font-extrabold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      ROLES &amp; METADATA
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Roles
                    </p>
                    <div
                      v-if="byComponent.responsibleRoles?.length"
                      class="space-y-1"
                    >
                      <div
                        v-for="(
                          role, roleIndex
                        ) in byComponent.responsibleRoles"
                        :key="`${byComponent.uuid}-requirement-by-component-role-${roleIndex}`"
                        class="flex flex-wrap items-center gap-1.5"
                      >
                        <p
                          class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                        >
                          {{ formatRoleLabel(role) }}
                        </p>
                        <span
                          v-if="getRolePartyTagText(role)"
                          class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                        >
                          {{ getRolePartyTagText(role) }}
                        </span>
                      </div>
                    </div>
                    <p
                      v-else
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      None
                    </p>

                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-secondary-foreground)]"
                    >
                      Metadata
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                    >
                      Props: {{ summarizeProps(byComponent.props) }}
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                    >
                      Links:
                    </p>
                    <div class="space-y-0.5">
                      <template v-if="byComponent.links?.length">
                        <a
                          v-for="(link, linkIndex) in byComponent.links"
                          :key="`${byComponent.uuid}-requirement-link-${linkIndex}`"
                          class="ui-v2-link block break-all font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold"
                          :href="link.href"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {{ link.href || link.text || 'link' }}
                        </a>
                      </template>
                      <p
                        v-else
                        class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-tertiary-foreground)]"
                      >
                        none
                      </p>
                    </div>
                  </section>
                </div>
              </article>
            </section>

            <section
              v-else-if="inspectorTab === 'parameters-roles'"
              class="space-y-3"
            >
              <div class="grid gap-3 md:grid-cols-2">
                <section
                  class="space-y-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
                >
                  <p
                    class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    SET PARAMETERS
                  </p>

                  <div
                    v-if="selectedRequirement.setParameters?.length"
                    class="space-y-2"
                  >
                    <div
                      v-for="(
                        parameter, parameterIndex
                      ) in selectedRequirement.setParameters"
                      :key="`${selectedRequirement.uuid}-requirement-param-${parameterIndex}`"
                      class="space-y-1 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-2"
                    >
                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[10px] font-bold text-[var(--ui-v2-foreground)]"
                      >
                        {{ parameter.paramId || 'unnamed-parameter' }}
                      </p>
                      <div class="flex flex-wrap gap-1.5">
                        <span
                          v-for="(value, valueIndex) in parameter.values || []"
                          :key="`${selectedRequirement.uuid}-requirement-param-${parameterIndex}-value-${valueIndex}`"
                          class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1.5 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-foreground)]"
                        >
                          {{ value }}
                        </span>
                      </div>
                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                      >
                        {{ parameter.remarks || 'No parameter remarks.' }}
                      </p>
                    </div>
                  </div>

                  <p
                    v-else
                    class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                  >
                    No set parameters defined.
                  </p>
                </section>

                <section
                  class="space-y-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
                >
                  <p
                    class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    RESPONSIBLE ROLES
                  </p>

                  <div
                    v-if="selectedRequirement.responsibleRoles?.length"
                    class="space-y-1.5"
                  >
                    <div
                      v-for="(
                        role, roleIndex
                      ) in selectedRequirement.responsibleRoles"
                      :key="`${selectedRequirement.uuid}-requirement-role-${roleIndex}`"
                      class="flex flex-wrap items-center gap-1.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-2"
                    >
                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold text-[var(--ui-v2-foreground)]"
                      >
                        {{ formatRoleLabel(role) }}
                      </p>
                      <span
                        v-if="getRolePartyTagText(role)"
                        class="inline-flex items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-1 py-[1px] font-[var(--ui-v2-font-secondary)] text-[8px] font-bold text-[var(--ui-v2-secondary-foreground)]"
                      >
                        {{ getRolePartyTagText(role) }}
                      </span>
                    </div>
                  </div>

                  <p
                    v-else
                    class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                  >
                    No responsible roles defined.
                  </p>
                </section>
              </div>
            </section>

            <section v-else class="space-y-3">
              <div class="grid gap-3 md:grid-cols-2">
                <section
                  class="space-y-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
                >
                  <p
                    class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    PROPERTIES
                  </p>

                  <div
                    v-if="selectedRequirement.props?.length"
                    class="space-y-1.5"
                  >
                    <div
                      v-for="(
                        property, propertyIndex
                      ) in selectedRequirement.props"
                      :key="`${selectedRequirement.uuid}-requirement-property-${property.uuid || propertyIndex}`"
                      class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-2"
                    >
                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[9px] font-extrabold text-[var(--ui-v2-secondary-foreground)]"
                      >
                        {{ property.name || 'unnamed-property' }}
                      </p>
                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold text-[var(--ui-v2-foreground)]"
                      >
                        {{ property.value || 'none' }}
                      </p>
                    </div>
                  </div>

                  <p
                    v-else
                    class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                  >
                    No properties defined.
                  </p>
                </section>

                <section
                  class="space-y-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
                >
                  <p
                    class="ui-v2-label text-[10px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    LINKS
                  </p>

                  <div
                    v-if="selectedRequirement.links?.length"
                    class="space-y-1.5"
                  >
                    <div
                      v-for="(link, linkIndex) in selectedRequirement.links"
                      :key="`${selectedRequirement.uuid}-requirement-link-${linkIndex}`"
                      class="space-y-0.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-2"
                    >
                      <a
                        class="ui-v2-link block break-all font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold"
                        :href="link.href"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ link.href || 'link' }}
                      </a>
                      <p
                        v-if="link.rel || link.text"
                        class="font-[var(--ui-v2-font-secondary)] text-[9px] font-semibold text-[var(--ui-v2-muted-foreground)]"
                      >
                        {{ link.rel || 'rel:n/a' }}
                        <span v-if="link.text"> | {{ link.text }}</span>
                      </p>
                    </div>
                  </div>

                  <p
                    v-else
                    class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                  >
                    No links defined.
                  </p>
                </section>
              </div>
            </section>
          </section>
        </div>
      </section>
    </template>

    <ControlImplementationModalForm
      v-if="showEditControlImplementationModal && controlImplementation"
      :ssp-id="sspId"
      :control-implementation="controlImplementation"
      @cancel="showEditControlImplementationModal = false"
      @saved="handleControlImplementationSaved"
    />

    <ImplementedRequirementModalForm
      v-if="showCreateRequirementModal"
      :ssp-id="sspId"
      @cancel="showCreateRequirementModal = false"
      @created="handleRequirementCreated"
    />
    <ImplementedRequirementModalForm
      v-if="showEditRequirementModal && editingRequirement"
      :ssp-id="sspId"
      :requirement="editingRequirement"
      @cancel="showEditRequirementModal = false"
      @saved="handleRequirementSaved"
    />

    <StatementModalForm
      v-if="showEditStatementModal && editingStatement"
      :ssp-id="sspId"
      :req-id="editingRequirement?.uuid || ''"
      :statement="editingStatement"
      @cancel="showEditStatementModal = false"
      @saved="handleStatementSaved"
    />
    <StatementModalForm
      v-if="showCreateStatementModal"
      :ssp-id="sspId"
      :req-id="editingRequirement?.uuid || ''"
      @cancel="showCreateStatementModal = false"
      @created="handleStatementCreated"
    />

    <ByComponentModalForm
      v-if="
        showCreateStatementByComponentModal &&
        editingRequirement &&
        editingStatement
      "
      :ssp-id="sspId"
      :requirement="editingRequirement"
      :statement="editingStatement"
      :system-components="systemComponents"
      @cancel="showCreateStatementByComponentModal = false"
      @created="handleStatementByComponentCreated"
    />
    <ByComponentModalForm
      v-if="
        showEditStatementByComponentModal &&
        editingByComponent &&
        editingRequirement &&
        editingStatement
      "
      :ssp-id="sspId"
      :requirement="editingRequirement"
      :statement="editingStatement"
      :by-component="editingByComponent"
      :system-components="systemComponents"
      @cancel="showEditStatementByComponentModal = false"
      @saved="handleStatementByComponentSaved"
    />

    <ByComponentModalForm
      v-if="
        showEditRequirementByComponentModal &&
        editingByComponent &&
        editingRequirement
      "
      :ssp-id="sspId"
      :requirement="editingRequirement"
      :by-component="editingByComponent"
      :system-components="systemComponents"
      @cancel="showEditRequirementByComponentModal = false"
      @saved="handleRequirementByComponentSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type {
  ByComponent,
  Catalog,
  Control,
  ControlImplementation,
  Group,
  ImplementedRequirement,
  Part,
  ResponsibleRole,
  Statement,
  SystemComponent,
} from '@/oscal';
import DangerButton from '@/volt/DangerButton.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import ControlImplementationModalForm from '@/components/v2/system-security-plans/forms/ControlImplementationModalForm.vue';
import ImplementedRequirementModalForm from '@/components/v2/system-security-plans/forms/ImplementedRequirementModalForm.vue';
import StatementModalForm from '@/components/v2/system-security-plans/forms/StatementModalForm.vue';
import ByComponentModalForm from '@/components/v2/system-security-plans/forms/ByComponentModalForm.vue';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import { getIdFromRoute } from '@/utils/get-poam-id-from-route';
import { sspDetailProfileBindingKey } from './sspDetailProfileBinding';

type InspectorTab =
  | 'statements'
  | 'requirement-components'
  | 'parameters-roles'
  | 'metadata';

interface CatalogIndex {
  controlTitleById: Map<string, string>;
  statementTextByScopedId: Map<string, string>;
}

const route = useRoute();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const sspId = computed(() => getIdFromRoute(route));

const profileBinding = inject(sspDetailProfileBindingKey, null);

const showEditControlImplementationModal = ref(false);
const showCreateRequirementModal = ref(false);
const showEditRequirementModal = ref(false);
const showEditStatementModal = ref(false);
const showCreateStatementModal = ref(false);
const showCreateStatementByComponentModal = ref(false);
const showEditStatementByComponentModal = ref(false);
const showEditRequirementByComponentModal = ref(false);

const editingRequirement = ref<ImplementedRequirement | null>(null);
const editingStatement = ref<Statement | null>(null);
const editingByComponent = ref<ByComponent | null>(null);

const inspectorTab = ref<InspectorTab>('statements');
const selectedRequirementUuid = ref('');

const {
  data: controlImplementation,
  isLoading: isControlImplementationLoading,
  error: controlImplementationError,
} = useDataApi<ControlImplementation>(
  `/api/oscal/system-security-plans/${route.params.id}/control-implementation`,
);

const { data: systemComponents } = useDataApi<SystemComponent[]>(
  `/api/oscal/system-security-plans/${route.params.id}/system-implementation/components`,
);

const { execute: executeDelete } = useDataApi<void>(null, { method: 'DELETE' });

const {
  data: resolvedCatalog,
  execute: executeResolvedCatalog,
  error: resolvedCatalogError,
} = useDataApi<Catalog>(null, null, { immediate: false });

const attachedProfileId = computed(
  () => profileBinding?.attachedProfileId.value || '',
);

watch(
  attachedProfileId,
  async (profileId) => {
    resolvedCatalog.value = undefined;

    if (!profileId) {
      return;
    }

    try {
      await executeResolvedCatalog(`/api/oscal/profiles/${profileId}/resolved`);
    } catch (error) {
      console.error('Failed to load resolved profile catalog:', error);
    }
  },
  { immediate: true },
);

const controlImplementationErrorMessage = computed(() => {
  if (!controlImplementationError.value) {
    return null;
  }
  if (typeof controlImplementationError.value === 'string') {
    return controlImplementationError.value;
  }
  if (controlImplementationError.value instanceof Error) {
    return controlImplementationError.value.message;
  }
  return 'Unable to load control implementation data.';
});

const requirements = computed(
  () => controlImplementation.value?.implementedRequirements || [],
);

watch(
  requirements,
  (nextRequirements) => {
    if (!nextRequirements.length) {
      selectedRequirementUuid.value = '';
      return;
    }

    const hasSelection = nextRequirements.some(
      (requirement) => requirement.uuid === selectedRequirementUuid.value,
    );

    if (!hasSelection) {
      selectedRequirementUuid.value = nextRequirements[0].uuid;
    }
  },
  { immediate: true },
);

const selectedRequirement = computed<ImplementedRequirement | null>(() => {
  if (!requirements.value.length) {
    return null;
  }

  return (
    requirements.value.find(
      (requirement) => requirement.uuid === selectedRequirementUuid.value,
    ) || requirements.value[0]
  );
});

const requirementCount = computed(() => requirements.value.length);

const totalStatements = computed(() => {
  return requirements.value.reduce((total, requirement) => {
    return total + (requirement.statements?.length || 0);
  }, 0);
});

const totalByComponents = computed(() => {
  return requirements.value.reduce((total, requirement) => {
    let nextTotal = total + (requirement.byComponents?.length || 0);

    (requirement.statements || []).forEach((statement) => {
      nextTotal += statement.byComponents?.length || 0;
    });

    return nextTotal;
  }, 0);
});

const selectedRequirementStatementCount = computed(
  () => selectedRequirement.value?.statements?.length || 0,
);

const selectedRequirementComponentCount = computed(
  () => selectedRequirement.value?.byComponents?.length || 0,
);

const inspectorTabItems = computed(
  () =>
    [
      {
        key: 'statements' as const,
        label: `STATEMENTS (${selectedRequirementStatementCount.value})`,
      },
      {
        key: 'requirement-components' as const,
        label: `REQ COMPONENTS (${selectedRequirementComponentCount.value})`,
      },
      {
        key: 'parameters-roles' as const,
        label: 'PARAMETERS / ROLES',
      },
      {
        key: 'metadata' as const,
        label: 'METADATA',
      },
    ] satisfies Array<{ key: InspectorTab; label: string }>,
);

const systemComponentById = computed(() => {
  const map = new Map<string, SystemComponent>();

  (systemComponents.value || []).forEach((component) => {
    map.set(normalizeKey(component.uuid), component);
  });

  return map;
});

const catalogIndex = computed(() => buildCatalogIndex(resolvedCatalog.value));

const selectedRequirementControlId = computed(() => {
  if (!selectedRequirement.value) {
    return 'UNSPECIFIED';
  }

  return (selectedRequirement.value.controlId || 'UNSPECIFIED').toUpperCase();
});

const selectedRequirementTitle = computed(() => {
  if (!selectedRequirement.value) {
    return 'No requirement title available.';
  }

  const controlTitle = resolveControlTitle(selectedRequirement.value.controlId);

  if (!controlTitle) {
    return 'No requirement title available.';
  }

  return controlTitle.toUpperCase();
});

function normalizeKey(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getLabelFromPart(part: Part): string {
  const labelProp = part.props?.find((prop) => prop.name === 'label');
  return String(labelProp?.value || '').trim();
}

function composeStatementText(part: Part): string {
  const label = getLabelFromPart(part);
  const prose = String(part.prose || '').trim();
  const title = String(part.title || '').trim();

  if (label && prose) {
    return `${label} ${prose}`;
  }

  if (prose) {
    return prose;
  }

  if (label) {
    return label;
  }

  return title;
}

function collectStatementTextMap(parts: Part[]): Map<string, string> {
  const map = new Map<string, string>();

  const walkPart = (part: Part): void => {
    if (normalizeKey(part.name) === 'statement' && part.id) {
      const statementKey = normalizeKey(part.id);
      if (statementKey && !map.has(statementKey)) {
        map.set(statementKey, composeStatementText(part));
      }
    }

    (part.parts || []).forEach(walkPart);
  };

  parts.forEach(walkPart);

  return map;
}

function buildCatalogIndex(catalog?: Catalog): CatalogIndex {
  const controlTitleById = new Map<string, string>();
  const statementTextByScopedId = new Map<string, string>();

  if (!catalog) {
    return {
      controlTitleById,
      statementTextByScopedId,
    };
  }

  const visitControl = (control: Control): void => {
    const controlKey = normalizeKey(control.id);

    if (controlKey && control.title) {
      controlTitleById.set(controlKey, control.title);
    }

    const statementMap = collectStatementTextMap(control.parts || []);

    statementMap.forEach((text, statementId) => {
      if (controlKey) {
        statementTextByScopedId.set(`${controlKey}::${statementId}`, text);
      }

      if (!statementTextByScopedId.has(`*::${statementId}`)) {
        statementTextByScopedId.set(`*::${statementId}`, text);
      }
    });

    (control.controls || []).forEach(visitControl);
  };

  const visitGroup = (group: Group): void => {
    (group.controls || []).forEach(visitControl);
    (group.groups || []).forEach(visitGroup);
  };

  (catalog.controls || []).forEach(visitControl);
  (catalog.groups || []).forEach(visitGroup);

  return {
    controlTitleById,
    statementTextByScopedId,
  };
}

function resolveControlTitle(controlId?: string): string {
  if (!controlId) {
    return '';
  }

  return catalogIndex.value.controlTitleById.get(normalizeKey(controlId)) || '';
}

function resolveStatementDescription(
  requirement: ImplementedRequirement,
  statement: Statement,
): string {
  const controlKey = normalizeKey(requirement.controlId);
  const statementKey = normalizeKey(statement.statementId);

  const scopedDescription =
    catalogIndex.value.statementTextByScopedId.get(
      `${controlKey}::${statementKey}`,
    ) ||
    catalogIndex.value.statementTextByScopedId.get(`*::${statementKey}`) ||
    statement.description;

  if (scopedDescription) {
    return scopedDescription;
  }

  if (resolvedCatalogError.value) {
    return 'Unable to resolve statement description from the attached profile.';
  }

  return 'No statement description available.';
}

function formatCompactUuid(uuid?: string): string {
  if (!uuid) {
    return 'n/a';
  }

  if (uuid.length <= 12) {
    return uuid;
  }

  return `${uuid.slice(0, 8)}-....`;
}

function formatShortToken(token?: string): string {
  if (!token) {
    return 'n/a';
  }

  if (token.length <= 8) {
    return token;
  }

  return `${token.slice(0, 4)}...`;
}

function getRequirementStatementCount(
  requirement: ImplementedRequirement,
): number {
  return requirement.statements?.length || 0;
}

function getRequirementByComponentCount(
  requirement: ImplementedRequirement,
): number {
  return requirement.byComponents?.length || 0;
}

function selectRequirement(requirement: ImplementedRequirement): void {
  selectedRequirementUuid.value = requirement.uuid;
}

function formatRoleLabel(role: ResponsibleRole): string {
  return `- ${role.roleId || 'unspecified-role'}`;
}

function getRolePartyTagText(role: ResponsibleRole): string {
  const count = role.partyUuids?.length || 0;

  if (count === 0) {
    return '';
  }

  if (count === 1) {
    return '1 party';
  }

  return `${count} parties`;
}

function getByComponentDisplayTitle(byComponent: ByComponent): string {
  const resolvedComponent = systemComponentById.value.get(
    normalizeKey(byComponent.componentUuid),
  );

  return (
    String(resolvedComponent?.title || '').toUpperCase() ||
    String(byComponent.componentUuid || 'UNKNOWN COMPONENT').toUpperCase()
  );
}

function getImplementationStateBadgeLabel(state?: string): string {
  if (!state) {
    return 'UNSET';
  }

  return state.replace(/[-_]/g, ' ').toUpperCase();
}

function getImplementationStateBadgeClass(state?: string): string {
  const normalizedState = normalizeKey(state);

  if (normalizedState === 'implemented') {
    return 'border-[color:var(--ui-v2-success)_/_0.3] bg-[color:var(--ui-v2-success)_/_0.1] text-[var(--ui-v2-success)]';
  }

  if (normalizedState === 'partial') {
    return 'border-[color:var(--ui-v2-primary)_/_0.3] bg-[color:var(--ui-v2-primary)_/_0.12] text-[var(--ui-v2-primary)]';
  }

  if (normalizedState === 'planned') {
    return 'border-[color:var(--ui-v2-info)_/_0.3] bg-[color:var(--ui-v2-info)_/_0.1] text-[var(--ui-v2-info)]';
  }

  if (normalizedState === 'alternative') {
    return 'border-[color:var(--ui-v2-secondary-foreground)_/_0.35] bg-[color:var(--ui-v2-secondary-foreground)_/_0.12] text-[var(--ui-v2-secondary-foreground)]';
  }

  if (normalizedState === 'not-applicable') {
    return 'border-[color:var(--ui-v2-tertiary-foreground)_/_0.35] bg-[color:var(--ui-v2-tertiary-foreground)_/_0.12] text-[var(--ui-v2-tertiary-foreground)]';
  }

  return 'border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-secondary-foreground)]';
}

function summarizeProps(props?: ByComponent['props']): string {
  if (!props?.length) {
    return 'none';
  }

  return props
    .map((property) => {
      const name = property.name || 'prop';
      const value = property.value || 'none';
      return `${name}=${value}`;
    })
    .join(', ');
}

function editControlImplementation(): void {
  showEditControlImplementationModal.value = true;
}

function handleControlImplementationSaved(
  updatedControlImplementation: ControlImplementation,
): void {
  controlImplementation.value = updatedControlImplementation;
  showEditControlImplementationModal.value = false;
}

function addRequirement(): void {
  showCreateRequirementModal.value = true;
}

function editRequirement(requirement: ImplementedRequirement): void {
  editingRequirement.value = requirement;
  showEditRequirementModal.value = true;
}

function confirmDeleteRequirement(requirement: ImplementedRequirement): void {
  confirmDeleteDialog(() => deleteRequirement(requirement), {
    itemName: requirement.controlId || 'Requirement',
    itemType: 'requirement',
  });
}

async function deleteRequirement(
  requirement: ImplementedRequirement,
): Promise<void> {
  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${route.params.id}/control-implementation/implemented-requirements/${requirement.uuid}`,
    );

    if (controlImplementation.value) {
      controlImplementation.value.implementedRequirements = (
        controlImplementation.value.implementedRequirements || []
      ).filter((candidate) => candidate.uuid !== requirement.uuid);
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
}

function handleRequirementCreated(
  newRequirement: ImplementedRequirement,
): void {
  if (!controlImplementation.value) {
    return;
  }

  if (!controlImplementation.value.implementedRequirements) {
    controlImplementation.value.implementedRequirements = [];
  }

  controlImplementation.value.implementedRequirements.push(newRequirement);
  selectedRequirementUuid.value = newRequirement.uuid;
  showCreateRequirementModal.value = false;
}

function handleRequirementSaved(
  updatedRequirement: ImplementedRequirement,
): void {
  if (controlImplementation.value) {
    const currentRequirements =
      controlImplementation.value.implementedRequirements || [];
    const index = currentRequirements.findIndex(
      (requirement) => requirement.uuid === updatedRequirement.uuid,
    );

    if (index !== -1) {
      currentRequirements[index] = updatedRequirement;
    }
  }

  selectedRequirementUuid.value = updatedRequirement.uuid;
  showEditRequirementModal.value = false;
  editingRequirement.value = null;
}

function createStatement(requirement: ImplementedRequirement): void {
  editingRequirement.value = requirement;
  showCreateStatementModal.value = true;
}

function editStatement(
  requirement: ImplementedRequirement,
  statement: Statement,
): void {
  editingRequirement.value = requirement;
  editingStatement.value = statement;
  showEditStatementModal.value = true;
}

function createStatementByComponent(
  requirement: ImplementedRequirement,
  statement: Statement,
): void {
  editingRequirement.value = requirement;
  editingStatement.value = statement;
  editingByComponent.value = null;
  showCreateStatementByComponentModal.value = true;
}

function editStatementByComponent(
  requirement: ImplementedRequirement,
  statement: Statement,
  byComponent: ByComponent,
): void {
  editingRequirement.value = requirement;
  editingStatement.value = statement;
  editingByComponent.value = byComponent;
  showEditStatementByComponentModal.value = true;
}

function editRequirementByComponent(
  requirement: ImplementedRequirement,
  byComponent: ByComponent,
): void {
  editingRequirement.value = requirement;
  editingStatement.value = null;
  editingByComponent.value = byComponent;
  showEditRequirementByComponentModal.value = true;
}

function handleStatementSaved(updatedStatement: Statement): void {
  if (controlImplementation.value && editingRequirement.value) {
    const requirementIndex = (
      controlImplementation.value.implementedRequirements || []
    ).findIndex(
      (requirement) => requirement.uuid === editingRequirement.value?.uuid,
    );

    if (requirementIndex !== -1) {
      const requirement =
        controlImplementation.value.implementedRequirements[requirementIndex];

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
}

function handleStatementByComponentCreated(newByComponent: ByComponent): void {
  if (
    controlImplementation.value &&
    editingRequirement.value &&
    editingStatement.value
  ) {
    const requirement = (
      controlImplementation.value.implementedRequirements || []
    ).find((candidate) => candidate.uuid === editingRequirement.value?.uuid);
    const statement = requirement?.statements?.find(
      (candidate) => candidate.uuid === editingStatement.value?.uuid,
    );

    if (statement) {
      if (!statement.byComponents) {
        statement.byComponents = [];
      }
      statement.byComponents.push(newByComponent);
    }
  }

  showCreateStatementByComponentModal.value = false;
  editingByComponent.value = null;
}

function handleStatementByComponentSaved(
  updatedByComponent: ByComponent,
): void {
  if (
    controlImplementation.value &&
    editingRequirement.value &&
    editingStatement.value
  ) {
    const requirement = (
      controlImplementation.value.implementedRequirements || []
    ).find((candidate) => candidate.uuid === editingRequirement.value?.uuid);
    const statement = requirement?.statements?.find(
      (candidate) => candidate.uuid === editingStatement.value?.uuid,
    );
    const index = statement?.byComponents?.findIndex(
      (candidate) => candidate.uuid === updatedByComponent.uuid,
    );

    if (statement?.byComponents && index !== undefined && index >= 0) {
      statement.byComponents[index] = updatedByComponent;
    }
  }

  showEditStatementByComponentModal.value = false;
  editingByComponent.value = null;
}

function handleRequirementByComponentSaved(
  updatedByComponent: ByComponent,
): void {
  if (controlImplementation.value && editingRequirement.value) {
    const requirement = (
      controlImplementation.value.implementedRequirements || []
    ).find((candidate) => candidate.uuid === editingRequirement.value?.uuid);
    const index = requirement?.byComponents?.findIndex(
      (candidate) => candidate.uuid === updatedByComponent.uuid,
    );

    if (requirement?.byComponents && index !== undefined && index >= 0) {
      requirement.byComponents[index] = updatedByComponent;
    }
  }

  showEditRequirementByComponentModal.value = false;
  editingByComponent.value = null;
  editingStatement.value = null;
}

function handleStatementCreated(newStatement: Statement): void {
  if (controlImplementation.value && editingRequirement.value) {
    const requirementIndex = (
      controlImplementation.value.implementedRequirements || []
    ).findIndex(
      (requirement) => requirement.uuid === editingRequirement.value?.uuid,
    );

    if (requirementIndex !== -1) {
      const requirement =
        controlImplementation.value.implementedRequirements[requirementIndex];

      if (!requirement.statements) {
        requirement.statements = [];
      }

      requirement.statements.push(newStatement);
    }
  }

  showCreateStatementModal.value = false;
  editingRequirement.value = null;
}

function confirmDeleteStatementByComponent(
  requirement: ImplementedRequirement,
  statement: Statement,
  byComponent: ByComponent,
): void {
  confirmDeleteDialog(
    () => deleteStatementByComponent(requirement, statement, byComponent),
    {
      itemName: getByComponentDisplayTitle(byComponent),
      itemType: 'by-component implementation',
    },
  );
}

async function deleteStatementByComponent(
  requirement: ImplementedRequirement,
  statement: Statement,
  byComponent: ByComponent,
): Promise<void> {
  try {
    await executeDelete(
      `/api/oscal/system-security-plans/${route.params.id}/control-implementation/implemented-requirements/${requirement.uuid}/statements/${statement.uuid}/by-components/${byComponent.uuid}`,
    );

    const currentRequirement = (
      controlImplementation.value?.implementedRequirements || []
    ).find((candidate) => candidate.uuid === requirement.uuid);
    const currentStatement = currentRequirement?.statements?.find(
      (candidate) => candidate.uuid === statement.uuid,
    );

    if (currentStatement?.byComponents) {
      currentStatement.byComponents = currentStatement.byComponents.filter(
        (candidate) => candidate.uuid !== byComponent.uuid,
      );
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'By-component implementation deleted successfully.',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete by-component implementation:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete by-component implementation. Please try again.',
      life: 5000,
    });
  }
}
</script>

<style scoped>
.requirements-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.requirements-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
</style>
