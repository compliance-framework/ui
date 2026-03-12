<template>
  <div class="space-y-6">
    <V2PageHeader
      eyebrow="Controls"
      title="Controls"
      description="Tree-first workflow: expand groups, implement statements inline, and open drawers only when needed."
    />

    <PrerequisiteGate
      v-if="!activePlan"
      title="Select an active system security plan"
      description="Controls is scoped to the active System Security Plan. Once an SSP is active, the app can load its attached profile, resolve the control tree, and merge implementation data."
      cta-label="Open SSP library"
      :cta-to="{ name: 'system-security-plans' }"
      hint="Your selected plan drives all Controls data."
    />

    <PrerequisiteGate
      v-else-if="profileMissing"
      title="Attach a profile to load controls"
      description="Controls loads from the profile linked to the active SSP. Open the active plan and attach a profile before implementing control statements."
      cta-label="Open active SSP"
      :cta-to="activeSspOverviewRoute"
      hint="The current workspace is blocked until the active plan has a linked profile."
    />

    <template v-else>
      <V2StatePanel
        v-if="pageLoading"
        kind="loading"
        title="Loading active controls"
        description="Fetching the attached profile, resolved controls, compliance status, and implementation data."
      />

      <template v-else>
        <V2StatePanel
          v-if="loadErrorMessage"
          kind="error"
          title="Unable to load controls"
          :description="loadErrorMessage"
        >
          <template #actions>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="ui-v2-nav border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-4 py-2 font-semibold text-[var(--ui-v2-background)]"
                @click="reloadControls"
              >
                Retry
              </button>
              <RouterLink
                :to="activeSspOverviewRoute"
                class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-4 py-2 text-[var(--ui-v2-foreground)]"
              >
                Open Active SSP
              </RouterLink>
            </div>
          </template>
        </V2StatePanel>

        <template v-else>
          <section
            class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5 lg:p-6"
          >
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-3">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  CONTROLS SUMMARY
                </p>
                <p class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
                  PROFILE {{ activeProfileTitle }}
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <article
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
                >
                  <p
                    class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                  >
                    IN SCOPE
                  </p>
                  <p class="ui-v2-metric text-[var(--ui-v2-info)]">
                    {{ contextMetrics.inScope }}
                  </p>
                </article>
                <article
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
                >
                  <p
                    class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                  >
                    IN PROGRESS
                  </p>
                  <p class="ui-v2-metric text-[var(--ui-v2-primary)]">
                    {{ contextMetrics.inProgress }}
                  </p>
                </article>
                <article
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
                >
                  <p
                    class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                  >
                    NEEDS EVIDENCE
                  </p>
                  <p class="ui-v2-metric text-[var(--ui-v2-warning)]">
                    {{ contextMetrics.needsEvidence }}
                  </p>
                </article>
              </div>
            </div>
          </section>

          <V2StatePanel
            v-if="!hasTreeData"
            kind="empty"
            title="This SSP does not currently resolve to a usable control tree"
            description="The active plan is linked, but no displayable controls were returned for this workspace."
          >
            <template #actions>
              <div class="flex flex-wrap gap-2">
                <RouterLink
                  :to="activeSspOverviewRoute"
                  class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
                >
                  Open Active SSP
                </RouterLink>
                <RouterLink
                  :to="{ name: 'system-security-plans' }"
                  class="ui-v2-nav border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-4 py-2 text-[var(--ui-v2-foreground)]"
                >
                  Change SSP
                </RouterLink>
              </div>
            </template>
          </V2StatePanel>

          <template v-else>
            <section
              class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-4 lg:p-5"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                  >
                    CONTROL TREE
                  </p>
                </div>

                <div
                  class="flex min-w-[320px] flex-1 flex-col gap-3 md:max-w-[720px]"
                >
                  <div class="relative">
                    <InputText
                      v-model="searchQuery"
                      fluid
                      placeholder="Search controls, statement IDs, or statement text..."
                      class="pl-9"
                    />
                    <V2LucideIcon
                      name="search"
                      :size="16"
                      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-v2-tertiary-foreground)]"
                    />
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="filter in statusFilters"
                      :key="filter.key"
                      type="button"
                      class="ui-v2-label border px-3 py-2 transition-colors"
                      :class="
                        activeStatusFilters.has(filter.key)
                          ? 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-foreground)]'
                          : 'border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-secondary-foreground)] hover:text-[var(--ui-v2-foreground)]'
                      "
                      @click="toggleStatusFilter(filter.key)"
                    >
                      {{ filter.label }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="overflow-x-auto">
                <div
                  class="min-w-[1100px] overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-border)]"
                >
                  <div
                    class="grid grid-cols-[minmax(0,1fr)_140px_120px_220px_120px] gap-3 border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 py-3"
                  >
                    <p
                      class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                    >
                      NODE
                    </p>
                    <p
                      class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                    >
                      STATUS
                    </p>
                    <p
                      class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                    >
                      COMPONENTS
                    </p>
                    <p
                      class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                    >
                      EVIDENCE
                    </p>
                    <p
                      class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]"
                    >
                      ACTION
                    </p>
                  </div>

                  <V2StatePanel
                    v-if="visibleRows.length === 0"
                    kind="empty"
                    title="No controls match the current filters"
                    description="Clear the search or remove status filters to see the full tree again."
                  >
                    <template #actions>
                      <button
                        type="button"
                        class="ui-v2-nav border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] px-4 py-2 font-semibold text-[var(--ui-v2-primary-foreground)]"
                        @click="resetFilters"
                      >
                        Clear filters
                      </button>
                    </template>
                  </V2StatePanel>

                  <template v-else>
                    <template v-for="row in visibleRows" :key="row.key">
                      <div
                        v-if="row.type === 'group'"
                        class="grid grid-cols-[minmax(0,1fr)_140px_120px_220px_120px] gap-3 border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 py-2.5"
                      >
                        <div class="relative">
                          <div
                            v-if="row.depth > 0"
                            class="pointer-events-none absolute inset-y-0 left-0"
                          >
                            <span
                              v-for="offset in treeIndentGuideOffsets(
                                row.depth,
                              )"
                              :key="`${row.key}-indent-${offset}`"
                              class="absolute inset-y-0 w-px bg-[var(--ui-v2-border)]"
                              :style="{ left: `${offset}px` }"
                            />
                          </div>
                          <button
                            type="button"
                            class="relative flex items-center gap-3 text-left"
                            :style="{
                              marginLeft: `${row.depth * TREE_INDENT_STEP}px`,
                            }"
                            @click="toggleExpanded(row.nodeKey)"
                          >
                            <V2LucideIcon
                              :name="
                                isRowExpanded(row.nodeKey)
                                  ? 'chevron-down'
                                  : 'chevron-right'
                              "
                              :size="16"
                              class="text-[var(--ui-v2-secondary-foreground)]"
                            />
                            <span
                              class="ui-v2-label inline-flex items-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-2 py-1 text-[var(--ui-v2-foreground)]"
                            >
                              {{ row.group.id }}
                            </span>
                            <span
                              class="font-[var(--ui-v2-font-primary)] text-[15px] font-bold text-[var(--ui-v2-foreground)]"
                            >
                              {{ row.group.title }}
                            </span>
                          </button>
                        </div>
                        <div class="flex items-center">
                          <V2StatusChip
                            :status="groupState(row.group).chipStatus"
                            :label="groupState(row.group).label"
                          />
                        </div>
                        <div class="flex items-center">
                          <p class="ui-v2-meta text-[var(--ui-v2-foreground)]">
                            {{ getGroupRollup(row.group).componentTotal }}
                          </p>
                        </div>
                        <div class="flex items-center">
                          <ControlsEvidenceSummary
                            :entries="getGroupRollup(row.group).evidenceEntries"
                          />
                        </div>
                        <div class="flex items-center" />
                      </div>

                      <div
                        v-else-if="row.type === 'control'"
                        class="grid grid-cols-[minmax(0,1fr)_140px_120px_220px_120px] gap-3 border-b border-[var(--ui-v2-border)] px-4 py-2.5 transition-colors"
                        :class="
                          isSelectedControl(row.control.id)
                            ? 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)]'
                            : 'border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]'
                        "
                      >
                        <div class="relative">
                          <div
                            v-if="row.depth > 0"
                            class="pointer-events-none absolute inset-y-0 left-0"
                          >
                            <span
                              v-for="offset in treeIndentGuideOffsets(
                                row.depth,
                              )"
                              :key="`${row.key}-indent-${offset}`"
                              class="absolute inset-y-0 w-px bg-[var(--ui-v2-border)]"
                              :style="{ left: `${offset}px` }"
                            />
                          </div>

                          <div
                            class="relative flex items-start gap-3"
                            :style="{
                              marginLeft: `${row.depth * TREE_INDENT_STEP}px`,
                            }"
                          >
                            <button
                              type="button"
                              class="mt-0.5 inline-flex h-5 w-5 items-center justify-center text-[var(--ui-v2-secondary-foreground)]"
                              :disabled="
                                !row.statementParts.length &&
                                !row.control.controls?.length
                              "
                              @click="toggleExpanded(row.nodeKey)"
                            >
                              <V2LucideIcon
                                :name="
                                  isRowExpanded(row.nodeKey)
                                    ? 'chevron-down'
                                    : 'chevron-right'
                                "
                                :size="16"
                              />
                            </button>

                            <div class="min-w-0">
                              <div class="flex flex-wrap items-center gap-2">
                                <span
                                  class="ui-v2-label inline-flex items-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2 py-1 text-[var(--ui-v2-foreground)]"
                                >
                                  {{ row.control.id }}
                                </span>
                                <p
                                  class="font-[var(--ui-v2-font-secondary)] text-[13px] font-semibold text-[var(--ui-v2-foreground)]"
                                >
                                  {{ row.control.title }}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div class="flex items-center">
                          <V2StatusChip
                            :status="
                              controlState(
                                row.control,
                                row.requirement,
                                row.statementParts,
                              ).chipStatus
                            "
                            :label="
                              controlState(
                                row.control,
                                row.requirement,
                                row.statementParts,
                              ).label
                            "
                          />
                        </div>

                        <div class="flex items-center">
                          <p class="ui-v2-meta text-[var(--ui-v2-foreground)]">
                            {{ getRequirementComponentTotal(row.requirement) }}
                          </p>
                        </div>

                        <div class="flex items-center">
                          <ControlsEvidenceSummary
                            :entries="getControlEvidenceEntries(row.control.id)"
                          />
                        </div>

                        <div class="flex items-center">
                          <button
                            type="button"
                            class="ui-v2-label text-[var(--ui-v2-info)] transition-colors hover:text-[var(--ui-v2-primary)]"
                            @click="openControlWorkspace(row.control)"
                          >
                            OPEN
                          </button>
                        </div>
                      </div>

                      <div
                        v-else-if="row.type === 'statement'"
                        class="grid grid-cols-[minmax(0,1fr)_140px_120px_220px_120px] gap-3 border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-4 py-2.5"
                      >
                        <div class="relative">
                          <div
                            v-if="row.depth > 0"
                            class="pointer-events-none absolute inset-y-0 left-0"
                          >
                            <span
                              v-for="offset in treeIndentGuideOffsets(
                                row.depth,
                              )"
                              :key="`${row.key}-indent-${offset}`"
                              class="absolute inset-y-0 w-px bg-[var(--ui-v2-border)]"
                              :style="{ left: `${offset}px` }"
                            />
                          </div>

                          <button
                            type="button"
                            class="relative flex min-w-0 items-start gap-3 text-left"
                            :style="{
                              marginLeft: `${row.depth * TREE_INDENT_STEP}px`,
                            }"
                            @click="toggleExpanded(row.nodeKey)"
                          >
                            <V2LucideIcon
                              :name="
                                isRowExpanded(row.nodeKey)
                                  ? 'chevron-down'
                                  : 'chevron-right'
                              "
                              :size="16"
                              class="mt-0.5 text-[var(--ui-v2-secondary-foreground)]"
                            />
                            <div class="min-w-0 space-y-1">
                              <div class="flex flex-wrap items-center gap-2">
                                <span
                                  class="ui-v2-label inline-flex items-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2 py-1 text-[var(--ui-v2-foreground)]"
                                >
                                  {{ row.statementPart.id }}
                                </span>
                                <p
                                  class="font-[var(--ui-v2-font-secondary)] text-[13px] font-medium text-[var(--ui-v2-foreground)]"
                                >
                                  {{ describeStatementPart(row.statementPart) }}
                                </p>
                              </div>
                            </div>
                          </button>
                        </div>

                        <div class="flex items-center">
                          <V2StatusChip
                            :status="statementState(row.statement).chipStatus"
                            :label="statementState(row.statement).label"
                          />
                        </div>

                        <div class="flex items-center">
                          <p class="ui-v2-meta text-[var(--ui-v2-foreground)]">
                            {{ row.statement?.byComponents?.length || 0 }}
                          </p>
                        </div>

                        <div class="flex items-center">
                          <p
                            class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]"
                          >
                            --
                          </p>
                        </div>

                        <div class="flex items-center">
                          <button
                            type="button"
                            class="ui-v2-label text-[var(--ui-v2-info)] transition-colors hover:text-[var(--ui-v2-primary)]"
                            @click="
                              handleStatementAction(
                                row.control,
                                row.statementPart,
                              )
                            "
                          >
                            IMPLEMENT
                          </button>
                        </div>
                      </div>

                      <div
                        v-else
                        class="border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 py-3"
                      >
                        <ControlsStatementDetailTree
                          :part="row.statementPart"
                          :depth="row.depth"
                          :statement-map="row.statementMap"
                          @select="
                            handleStatementDetailAction(
                              row.control,
                              row.statementPart,
                              $event,
                            )
                          "
                        />
                      </div>
                    </template>
                  </template>
                </div>
              </div>
            </section>
          </template>
        </template>
      </template>
    </template>

    <V2WorkspaceDrawer
      v-if="controlWorkspaceOpen && selectedRequirement && selectedControlEntry"
      title="OPEN REQUIREMENT"
      :description="`${selectedRequirement.controlId} · ${selectedControlEntry.control.title}`"
      width-class="w-screen! sm:w-[94vw]! lg:w-[560px]!"
      @close="closeControlWorkspace"
    >
      <SspEditorSection title="COMPONENTS">
        <template #actions>
          <SecondaryButton
            type="button"
            size="small"
            @click="openCreateComponentModal('requirement')"
          >
            CREATE SYSTEM COMPONENT
          </SecondaryButton>
        </template>

        <p
          v-if="requirementWorkspaceNote"
          class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]"
        >
          {{ requirementWorkspaceNote }}
        </p>

        <p
          v-if="(selectedRequirement.byComponents?.length || 0) === 0"
          class="ui-v2-body text-[var(--ui-v2-muted-foreground)]"
        >
          No requirement components yet.
        </p>

        <div v-else class="space-y-3">
          <article
            v-for="byComponent in selectedRequirement.byComponents || []"
            :key="byComponent.uuid"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-4 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1.5">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  {{ resolveComponentTitle(byComponent.componentUuid) }}
                </p>
                <p class="ui-v2-body text-[var(--ui-v2-foreground)]">
                  {{
                    byComponent.description || 'No component description yet.'
                  }}
                </p>
              </div>

              <SecondaryButton
                type="button"
                size="small"
                @click="openEditRequirementByComponentModal(byComponent)"
              >
                EDIT
              </SecondaryButton>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <V2StatusChip
                :status="byComponent.implementationStatus?.state || 'unknown'"
                :label="
                  formatImplementationState(
                    byComponent.implementationStatus?.state,
                  )
                "
              />
              <p
                v-if="byComponent.remarks"
                class="ui-v2-meta text-[var(--ui-v2-muted-foreground)]"
              >
                {{ byComponent.remarks }}
              </p>
            </div>
          </article>
        </div>
      </SspEditorSection>
    </V2WorkspaceDrawer>

    <V2WorkspaceDrawer
      v-if="
        statementWorkspaceOpen &&
        selectedRequirement &&
        selectedControlEntry &&
        selectedStatementPart
      "
      title="IMPLEMENT STATEMENT"
      :description="`${selectedStatementPart.id} · ${selectedRequirement.controlId} · ${selectedControlEntry.control.title}`"
      width-class="w-screen! sm:w-[94vw]! lg:w-[900px]!"
      @close="closeStatementWorkspace"
    >
      <template #actions>
        <PrimaryButton
          v-if="!selectedStatementRecord"
          type="button"
          size="small"
          class="!h-8 !px-4 !py-0 !text-[10px] shrink-0"
          @click="openCreateStatementModal(selectedStatementPart)"
        >
          CREATE STATEMENT
        </PrimaryButton>
        <SecondaryButton
          v-else
          type="button"
          size="small"
          @click="openEditStatementModal(selectedStatementRecord)"
        >
          EDIT STATEMENT
        </SecondaryButton>
      </template>

      <div class="space-y-2">
        <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
          {{ selectedStatementPart.id }}
        </p>
        <p class="ui-v2-body text-[var(--ui-v2-foreground)]">
          {{ describeStatementPart(selectedStatementPart) }}
        </p>
        <p class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
          {{
            selectedStatementRecord
              ? 'Add components or manage evidence for this saved statement.'
              : 'Create the statement record first, then add components or dashboards.'
          }}
        </p>
      </div>

      <SspEditorSection title="COMPONENTS">
        <template #actions>
          <div class="flex flex-wrap gap-2">
            <SecondaryButton
              type="button"
              size="small"
              @click="openCreateComponentModal('statement')"
            >
              CREATE SYSTEM COMPONENT
            </SecondaryButton>
            <PrimaryButton
              v-if="selectedStatementRecord"
              type="button"
              size="small"
              @click="openCreateStatementByComponentModal()"
            >
              ADD COMPONENT
            </PrimaryButton>
          </div>
        </template>

        <p
          v-if="!selectedStatementRecord"
          class="ui-v2-body text-[var(--ui-v2-muted-foreground)]"
        >
          Save this statement to add statement-level components.
        </p>

        <p
          v-else-if="(selectedStatementRecord.byComponents?.length || 0) === 0"
          class="ui-v2-body text-[var(--ui-v2-muted-foreground)]"
        >
          No statement components yet.
        </p>

        <div v-else class="space-y-3">
          <article
            v-for="byComponent in selectedStatementRecord.byComponents || []"
            :key="byComponent.uuid"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-4 py-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1.5">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  {{ resolveComponentTitle(byComponent.componentUuid) }}
                </p>
                <p class="ui-v2-body text-[var(--ui-v2-foreground)]">
                  {{
                    byComponent.description || 'No component description yet.'
                  }}
                </p>
              </div>
              <div class="flex gap-2">
                <SecondaryButton
                  type="button"
                  size="small"
                  @click="openEditStatementByComponentModal(byComponent)"
                >
                  EDIT
                </SecondaryButton>
                <button
                  type="button"
                  class="ui-v2-nav text-[var(--ui-v2-error)]"
                  @click="confirmDeleteStatementByComponent(byComponent)"
                >
                  DELETE
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <V2StatusChip
                :status="byComponent.implementationStatus?.state || 'unknown'"
                :label="
                  formatImplementationState(
                    byComponent.implementationStatus?.state,
                  )
                "
              />
              <p
                v-if="byComponent.remarks"
                class="ui-v2-meta text-[var(--ui-v2-muted-foreground)]"
              >
                {{ byComponent.remarks }}
              </p>
            </div>
          </article>
        </div>
      </SspEditorSection>

      <SspEditorSection title="DASHBOARDS">
        <template #actions>
          <div v-if="selectedStatementRecord" class="flex flex-wrap gap-2">
            <SecondaryButton
              type="button"
              size="small"
              @click="toggleCreateDashboardForm"
            >
              {{ showCreateDashboardForm ? 'CLOSE' : 'CREATE DASHBOARD' }}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              size="small"
              @click="toggleLinkDashboardForm"
            >
              {{ showLinkDashboardForm ? 'CLOSE' : 'LINK DASHBOARD' }}
            </SecondaryButton>
          </div>
        </template>

        <p
          v-if="!selectedStatementRecord"
          class="ui-v2-body text-[var(--ui-v2-muted-foreground)]"
        >
          Save this statement to create or link dashboards.
        </p>

        <template v-if="selectedStatementRecord">
          <form
            v-if="showCreateDashboardForm"
            class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            @submit.prevent="submitDashboardCreate"
          >
            <div class="grid gap-4 md:grid-cols-2">
              <V2FormField
                label="DASHBOARD NAME"
                input-id="controls-dashboard-name"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="evidenceDashboard.name"
                    :input-id="fieldProps.inputId"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField
                label="BASELINE EVIDENCE"
                input-id="controls-dashboard-baseline"
              >
                <template #default="fieldProps">
                  <Select
                    v-model="selectedBaselineEvidence"
                    :input-id="fieldProps.inputId"
                    :options="uniqueEvidenceTitles"
                    option-label="title"
                    filter
                    :filter-fields="['title', 'searchText']"
                    :loading="evidenceLoading"
                    placeholder="Select evidence..."
                  />
                </template>
              </V2FormField>
            </div>

            <div
              v-if="selectedBaselineEvidence"
              class="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <V2FormField
                label="LABEL NAME"
                input-id="controls-dashboard-label-name"
              >
                <template #default="fieldProps">
                  <Select
                    v-model="newLabelName"
                    :input-id="fieldProps.inputId"
                    :options="availableLabelNames"
                    placeholder="Label name"
                  />
                </template>
              </V2FormField>

              <V2FormField
                label="VALUE"
                input-id="controls-dashboard-label-value"
              >
                <template #default="fieldProps">
                  <Select
                    v-model="newLabelValue"
                    :input-id="fieldProps.inputId"
                    :options="availableLabelValues"
                    :disabled="!newLabelName"
                    placeholder="Value"
                  />
                </template>
              </V2FormField>

              <div class="flex items-end">
                <PrimaryButton
                  type="button"
                  :disabled="!newLabelName || !newLabelValue"
                  @click="addLabelCondition"
                >
                  ADD
                </PrimaryButton>
              </div>
            </div>

            <div v-if="labelConditions.length" class="flex flex-wrap gap-2">
              <button
                v-for="(condition, index) in labelConditions"
                :key="`${condition.name}-${condition.value}-${index}`"
                type="button"
                class="ui-v2-label border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 py-2 text-[var(--ui-v2-foreground)]"
                @click="removeLabelCondition(index)"
              >
                {{ condition.name }}={{ condition.value }} ×
              </button>
            </div>

            <div
              class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
            >
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                GENERATED FILTER
              </p>
              <p
                class="mt-2 break-all font-mono text-[11px] text-[var(--ui-v2-foreground)]"
              >
                {{
                  computedFilter || 'Add label conditions to build the filter.'
                }}
              </p>
            </div>

            <div class="flex justify-end gap-2">
              <SecondaryButton type="button" @click="resetDashboardCreateForm">
                CANCEL
              </SecondaryButton>
              <PrimaryButton
                type="submit"
                :disabled="!computedFilter || !evidenceDashboard.name.trim()"
              >
                CREATE
              </PrimaryButton>
            </div>
          </form>

          <form
            v-if="showLinkDashboardForm"
            class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            @submit.prevent="linkExistingDashboard"
          >
            <V2FormField
              label="AVAILABLE DASHBOARDS"
              input-id="controls-dashboard-link"
            >
              <template #default="fieldProps">
                <Select
                  v-model="selectedDashboardToLink"
                  :input-id="fieldProps.inputId"
                  :options="availableDashboardsToLink"
                  option-label="name"
                  filter
                  placeholder="Select a dashboard to link..."
                />
              </template>
            </V2FormField>

            <div class="flex justify-end gap-2">
              <SecondaryButton type="button" @click="resetDashboardLinkForm">
                CANCEL
              </SecondaryButton>
              <PrimaryButton type="submit" :disabled="!selectedDashboardToLink">
                LINK
              </PrimaryButton>
            </div>
          </form>
        </template>

        <p
          v-if="dashboardsLoading"
          class="ui-v2-body text-[var(--ui-v2-muted-foreground)]"
        >
          Loading dashboards...
        </p>

        <p
          v-else-if="selectedStatementRecord && existingDashboards.length === 0"
          class="ui-v2-body text-[var(--ui-v2-muted-foreground)]"
        >
          No dashboards linked yet.
        </p>

        <div v-else class="grid gap-4 lg:grid-cols-2">
          <article
            v-for="dashboard in existingDashboards"
            :key="dashboard.id || dashboard.name"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-4 py-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <h4
                  class="truncate font-[var(--ui-v2-font-primary)] text-[15px] font-bold text-[var(--ui-v2-foreground)]"
                  :title="dashboard.name"
                >
                  {{ dashboard.name }}
                </h4>
                <p class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
                  Control-linked evidence dashboard
                </p>
              </div>

              <button
                type="button"
                class="ui-v2-nav text-[var(--ui-v2-error)]"
                @click="confirmUnlinkDashboard(dashboard)"
              >
                UNLINK
              </button>
            </div>

            <DashboardMiniStatusChartV2 :filter="dashboard.filter" />

            <div class="flex justify-end">
              <SecondaryButton
                type="button"
                size="small"
                @click="viewDashboardEvidence(dashboard)"
              >
                VIEW EVIDENCE
              </SecondaryButton>
            </div>
          </article>
        </div>
      </SspEditorSection>
    </V2WorkspaceDrawer>

    <StatementModalForm
      v-if="showCreateStatementModal && editingRequirement"
      :ssp-id="activeSspId"
      :req-id="editingRequirement.uuid"
      :suggested-statement-id="suggestedStatementId"
      @cancel="showCreateStatementModal = false"
      @created="handleStatementCreated"
    />

    <StatementModalForm
      v-if="showEditStatementModal && editingRequirement && editingStatement"
      :ssp-id="activeSspId"
      :req-id="editingRequirement.uuid"
      :statement="editingStatement"
      @cancel="showEditStatementModal = false"
      @saved="handleStatementSaved"
    />

    <ByComponentModalForm
      v-if="
        showCreateStatementByComponentModal &&
        editingRequirement &&
        editingStatement
      "
      :ssp-id="activeSspId"
      :requirement="editingRequirement"
      :statement="editingStatement"
      :system-components="systemComponentsData || []"
      :preferred-component-uuid="preferredComponentUuid"
      @cancel="showCreateStatementByComponentModal = false"
      @created="handleStatementByComponentCreated"
    />

    <ByComponentModalForm
      v-if="
        showEditStatementByComponentModal &&
        editingRequirement &&
        editingStatement &&
        editingByComponent
      "
      :ssp-id="activeSspId"
      :requirement="editingRequirement"
      :statement="editingStatement"
      :by-component="editingByComponent"
      :system-components="systemComponentsData || []"
      @cancel="showEditStatementByComponentModal = false"
      @saved="handleStatementByComponentSaved"
    />

    <ByComponentModalForm
      v-if="
        showEditRequirementByComponentModal &&
        editingRequirement &&
        editingByComponent
      "
      :ssp-id="activeSspId"
      :requirement="editingRequirement"
      :by-component="editingByComponent"
      :system-components="systemComponentsData || []"
      @cancel="showEditRequirementByComponentModal = false"
      @saved="handleRequirementByComponentSaved"
    />

    <SystemImplementationComponentModalForm
      v-if="showCreateComponentModal"
      :ssp-id="activeSspId"
      @cancel="showCreateComponentModal = false"
      @created="handleSystemComponentCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { AxiosError } from 'axios';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Select from '@/volt/Select.vue';
import type {
  Catalog,
  Control,
  ControlImplementation,
  Group,
  ImplementedRequirement,
  Part,
  Profile,
  Statement,
  SystemComponent,
  ByComponent,
} from '@/oscal';
import type { Dashboard, DashboardCreate } from '@/stores/filters';
import type { Evidence } from '@/stores/evidence';
import type {
  ProfileComplianceControl,
  ProfileComplianceStatusCount,
} from '@/types/compliance';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useCatalogTree, type TreeNode } from '@/composables/useCatalogTree';
import { useProfileCompliance } from '@/composables/useProfileCompliance';
import { useSystemStore } from '@/stores/system';
import { useUIStore } from '@/stores/ui';
import { FilterParser } from '@/parsers/labelfilter';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import {
  cloneValue,
  resolveApiErrorMessage,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import V2WorkspaceDrawer from '@/components/v2/patterns/V2WorkspaceDrawer.vue';
import PrerequisiteGate from '@/components/v2/system/PrerequisiteGate.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2LucideIcon from '@/components/v2/primitives/V2LucideIcon.vue';
import V2StatusChip from '@/components/v2/primitives/V2StatusChip.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import StatementModalForm from '@/components/v2/system-security-plans/forms/StatementModalForm.vue';
import ByComponentModalForm from '@/components/v2/system-security-plans/forms/ByComponentModalForm.vue';
import SystemImplementationComponentModalForm from '@/components/v2/system-security-plans/forms/SystemImplementationComponentModalForm.vue';
import DashboardMiniStatusChartV2 from '@/components/v2/dashboard/DashboardMiniStatusChartV2.vue';
import ControlsEvidenceSummary from '@/components/v2/controls/ControlsEvidenceSummary.vue';
import ControlsStatementDetailTree from '@/components/v2/controls/ControlsStatementDetailTree.vue';

type StatusFilterKey = 'not-started' | 'in-progress' | 'needs-evidence';
type ComponentFlowContext = 'statement' | 'requirement';

interface SearchableEvidence extends Evidence {
  searchText: string;
}

interface LabelCondition {
  name: string;
  value: string;
}

interface ControlCatalogEntry {
  control: Control;
  statementParts: Part[];
}

interface GroupRollup {
  controlCount: number;
  componentTotal: number;
  evidenceEntries: ProfileComplianceStatusCount[];
  inProgressCount: number;
}

const TREE_INDENT_STEP = 18;

type ControlsTreeRow =
  | {
      type: 'group';
      key: string;
      nodeKey: string;
      depth: number;
      group: Group;
    }
  | {
      type: 'control';
      key: string;
      nodeKey: string;
      depth: number;
      control: Control;
      requirement: ImplementedRequirement | null;
      statementParts: Part[];
    }
  | {
      type: 'statement';
      key: string;
      nodeKey: string;
      depth: number;
      control: Control;
      requirement: ImplementedRequirement | null;
      statementPart: Part;
      statement: Statement | null;
    }
  | {
      type: 'detail';
      key: string;
      depth: number;
      control: Control;
      statementPart: Part;
      statementMap: Record<string, Statement | undefined>;
    };

const router = useRouter();
const toast = useToast();
const systemStore = useSystemStore();
const uiStore = useUIStore();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const activePlan = computed(() => systemStore.system.securityPlan);
const activeSspId = computed(() => activePlan.value?.uuid || '');

const { data: profileData, execute: executeProfile } = useDataApi<Profile>(
  null,
  null,
  { immediate: false },
);

const { data: resolvedCatalogData, execute: executeResolvedCatalog } =
  useDataApi<Catalog>(null, null, { immediate: false });

const {
  data: controlImplementationData,
  execute: executeControlImplementation,
} = useDataApi<ControlImplementation>(null, null, { immediate: false });

const { data: systemComponentsData, execute: executeSystemComponents } =
  useDataApi<SystemComponent[]>(null, null, { immediate: false });

const { data: createdRequirementData, execute: executeCreateRequirement } =
  useDataApi<ImplementedRequirement>(
    null,
    {
      method: 'POST',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

const { execute: executeDeleteStatementByComponent } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

const { execute: executeCreateDashboard } = useDataApi<Dashboard>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const {
  data: dashboardsByControlData,
  execute: executeFetchDashboardsByControl,
} = useDataApi<Dashboard[]>(null, null, { immediate: false });

const { data: allDashboardsData, execute: executeFetchAllDashboards } =
  useDataApi<Dashboard[]>(null, null, { immediate: false });

const { execute: executeUpdateDashboard } = useDataApi<Dashboard>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const { data: evidenceSearchData, execute: executeEvidenceSearch } = useDataApi<
  Evidence[]
>('/api/evidence/search', { method: 'POST' }, { immediate: false });

const { nodes, build } = useCatalogTree();
const { controls: complianceControls, loadCompliance } = useProfileCompliance(
  computed(() => profileData.value?.uuid || ''),
);

const profileMissing = ref(false);
const isReloading = ref(false);
const loadErrorMessage = ref<string | null>(null);

const searchQuery = ref('');
const activeStatusFilters = ref<Set<StatusFilterKey>>(new Set());
const selectedStatementPartId = ref('');

const showCreateStatementModal = ref(false);
const showEditStatementModal = ref(false);
const showCreateStatementByComponentModal = ref(false);
const showEditStatementByComponentModal = ref(false);
const showEditRequirementByComponentModal = ref(false);
const showCreateComponentModal = ref(false);
const showCreateDashboardForm = ref(false);
const showLinkDashboardForm = ref(false);

const preferredComponentUuid = ref('');
const componentFlowContext = ref<ComponentFlowContext>('statement');
const suggestedStatementId = ref('');

const editingRequirement = ref<ImplementedRequirement | null>(null);
const editingStatement = ref<Statement | null>(null);
const editingByComponent = ref<ByComponent | null>(null);
const controlWorkspaceOpen = ref(false);
const statementWorkspaceOpen = ref(false);

const existingDashboards = ref<Dashboard[]>([]);
const allDashboards = ref<Dashboard[]>([]);
const dashboardsLoading = ref(false);
const selectedDashboardToLink = ref<Dashboard | null>(null);

const evidenceDashboard = ref<{ name: string; filter: string }>({
  name: '',
  filter: '',
});
const availableEvidence = ref<SearchableEvidence[]>([]);
const selectedBaselineEvidence = ref<SearchableEvidence | null>(null);
const evidenceLoading = ref(false);
const labelConditions = ref<LabelCondition[]>([]);
const newLabelName = ref('');
const newLabelValue = ref('');

const expandedKeys = computed(() => uiStore.controlImplementationExpandedKeys);
const selectedRequirementId = computed(
  () => uiStore.controlImplementationSelectedRequirementId,
);

const statusFilters = [
  { key: 'not-started' as const, label: 'NOT STARTED' },
  { key: 'in-progress' as const, label: 'IN PROGRESS' },
  { key: 'needs-evidence' as const, label: 'NEEDS EVIDENCE' },
];

const pageLoading = computed(() => isReloading.value);

const activeSspOverviewRoute = computed(() => ({
  name: 'system-security-plan-overview',
  params: { id: activeSspId.value },
}));

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase());
const forceExpanded = computed(() => normalizedSearch.value.length > 0);

const activeProfileTitle = computed(
  () =>
    profileData.value?.metadata?.title?.trim() || 'Linked profile unavailable',
);

const complianceControlMap = computed(() => {
  const map = new Map<string, ProfileComplianceControl>();
  (complianceControls.value || []).forEach((control) => {
    map.set(normalizeKey(control.controlId), control);
  });
  return map;
});

const requirementMap = computed(() => {
  const map = new Map<string, ImplementedRequirement>();
  (controlImplementationData.value?.implementedRequirements || []).forEach(
    (requirement) => {
      map.set(normalizeKey(requirement.controlId), requirement);
    },
  );
  return map;
});

const controlCatalogMap = computed(() =>
  buildControlCatalogMap(resolvedCatalogData.value),
);

const groupRollupMap = computed(() =>
  buildGroupRollupMap(resolvedCatalogData.value),
);

const contextMetrics = computed(() => {
  let inProgress = 0;
  let needsEvidence = 0;

  controlCatalogMap.value.forEach((entry) => {
    const state = controlState(
      entry.control,
      requirementMap.value.get(normalizeKey(entry.control.id)) || null,
      entry.statementParts,
    );

    if (state.filterKeys.has('in-progress')) {
      inProgress += 1;
    }
    if (state.filterKeys.has('needs-evidence')) {
      needsEvidence += 1;
    }
  });

  return {
    inScope: controlCatalogMap.value.size,
    inProgress,
    needsEvidence,
  };
});

const visibleRows = computed(() => buildVisibleRows(nodes.value));
const hasTreeData = computed(() => controlCatalogMap.value.size > 0);

const selectedRequirement = computed<ImplementedRequirement | null>(() => {
  const selectedId = selectedRequirementId.value;
  if (!selectedId) {
    return null;
  }

  return (
    (controlImplementationData.value?.implementedRequirements || []).find(
      (requirement) => requirement.uuid === selectedId,
    ) || null
  );
});

const selectedControlEntry = computed<ControlCatalogEntry | null>(() => {
  if (!selectedRequirement.value?.controlId) {
    return null;
  }

  return (
    controlCatalogMap.value.get(
      normalizeKey(selectedRequirement.value.controlId),
    ) || null
  );
});

const selectedControlStatementCount = computed(
  () => selectedControlEntry.value?.statementParts.length || 0,
);

const requirementWorkspaceNote = computed(() => {
  if (selectedControlStatementCount.value === 0) {
    return 'No statement parts in this control. Requirement-level components are the editable records here.';
  }

  return '';
});

const selectedStatementPart = computed<Part | null>(() => {
  if (!selectedControlEntry.value || !selectedStatementPartId.value) {
    return null;
  }

  return findPartById(
    selectedControlEntry.value.control.parts,
    selectedStatementPartId.value,
  );
});

const selectedStatementRecord = computed<Statement | null>(() => {
  if (!selectedRequirement.value || !selectedStatementPart.value?.id) {
    return null;
  }

  return (
    selectedRequirement.value.statements?.find(
      (statement) =>
        normalizeKey(statement.statementId) ===
        normalizeKey(selectedStatementPart.value?.id),
    ) || null
  );
});

const uniqueEvidenceTitles = computed(() => {
  const titleMap = new Map<string, SearchableEvidence>();
  for (const evidence of availableEvidence.value) {
    if (!titleMap.has(evidence.title)) {
      titleMap.set(evidence.title, evidence);
    }
  }
  return Array.from(titleMap.values());
});

const evidenceEntriesForSelectedTitle = computed(() => {
  if (!selectedBaselineEvidence.value) {
    return [];
  }

  return availableEvidence.value.filter(
    (evidence) => evidence.title === selectedBaselineEvidence.value?.title,
  );
});

const availableLabelNames = computed(() => {
  const names = new Set<string>();
  evidenceEntriesForSelectedTitle.value.forEach((evidence) => {
    evidence.labels?.forEach((label) => {
      names.add(label.name);
    });
  });
  return Array.from(names).sort();
});

const availableLabelValues = computed(() => {
  if (!newLabelName.value) {
    return [];
  }

  const values = new Set<string>();
  evidenceEntriesForSelectedTitle.value.forEach((evidence) => {
    const matchesExistingConditions = labelConditions.value.every((condition) =>
      evidence.labels?.some(
        (label) =>
          label.name === condition.name && label.value === condition.value,
      ),
    );

    if (!matchesExistingConditions) {
      return;
    }

    evidence.labels?.forEach((label) => {
      if (label.name === newLabelName.value) {
        values.add(label.value);
      }
    });
  });

  return Array.from(values).sort();
});

const computedFilter = computed(() => {
  if (!labelConditions.value.length) {
    return '';
  }

  return labelConditions.value
    .map((condition) => `${condition.name}=${condition.value}`)
    .join(' and ');
});

const availableDashboardsToLink = computed(() => {
  const controlId = selectedRequirement.value?.controlId;
  if (!controlId) {
    return [];
  }

  return allDashboards.value.filter(
    (dashboard) =>
      !dashboard.controls?.some((control) => control.id === controlId) &&
      !dashboard.components?.length,
  );
});

watch(
  activeSspId,
  () => {
    resetControlsUiState();
    void reloadControls();
  },
  { immediate: true },
);

watch(
  resolvedCatalogData,
  (catalog) => {
    if (!catalog) {
      nodes.value = [];
      return;
    }

    build(catalog);
  },
  { immediate: true },
);

watch(
  selectedRequirement,
  (requirement) => {
    if (!requirement) {
      controlWorkspaceOpen.value = false;
      statementWorkspaceOpen.value = false;
      selectedStatementPartId.value = '';
      resetDashboardPanels();
      return;
    }

    const entry =
      controlCatalogMap.value.get(normalizeKey(requirement.controlId)) || null;
    if (!entry || entry.statementParts.length === 0) {
      selectedStatementPartId.value = '';
      return;
    }

    if (
      selectedStatementPartId.value &&
      !findPartById(entry.control.parts, selectedStatementPartId.value)
    ) {
      selectedStatementPartId.value = '';
    }
  },
  { immediate: true },
);

watch(
  () => selectedRequirement.value?.controlId,
  async (controlId) => {
    existingDashboards.value = [];
    allDashboards.value = [];

    if (!controlId) {
      return;
    }

    dashboardsLoading.value = true;
    try {
      await Promise.all([
        loadDashboardsForControl(controlId),
        loadAllDashboards(),
      ]);
    } finally {
      dashboardsLoading.value = false;
    }
  },
  { immediate: true },
);

watch(showCreateDashboardForm, async (open) => {
  if (!open) {
    return;
  }

  await loadAvailableEvidence();
});

watch(selectedBaselineEvidence, (evidence) => {
  if (!evidence) {
    labelConditions.value = [];
    return;
  }

  const policyLabel = evidence.labels?.find(
    (label) => label.name === '_policy',
  );
  labelConditions.value = policyLabel
    ? [{ name: policyLabel.name, value: policyLabel.value }]
    : [];
  newLabelName.value = '';
  newLabelValue.value = '';
});

watch(computedFilter, (value) => {
  evidenceDashboard.value.filter = value;
});

function normalizeKey(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function findPartById(parts: Part[] | undefined, partId: string): Part | null {
  if (!parts?.length || !partId) {
    return null;
  }

  for (const part of parts) {
    if (normalizeKey(part.id) === normalizeKey(partId)) {
      return part;
    }

    const childMatch = findPartById(part.parts, partId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function resetControlsUiState(): void {
  controlWorkspaceOpen.value = false;
  statementWorkspaceOpen.value = false;
  selectedStatementPartId.value = '';
  searchQuery.value = '';
  activeStatusFilters.value = new Set();
  resetDashboardPanels();
  uiStore.setControlImplementationSelectedRequirementId(null);
  uiStore.setControlImplementationExpandedKeys({});
}

function isSelectedControl(controlId?: string): boolean {
  return (
    normalizeKey(selectedRequirement.value?.controlId) ===
    normalizeKey(controlId)
  );
}

function isRowExpanded(nodeKey: string): boolean {
  if (forceExpanded.value) {
    return true;
  }

  return Boolean(expandedKeys.value[nodeKey]);
}

function setExpanded(nodeKey: string, expanded: boolean): void {
  const nextKeys = { ...expandedKeys.value };
  if (expanded) {
    nextKeys[nodeKey] = true;
  } else {
    delete nextKeys[nodeKey];
  }
  uiStore.setControlImplementationExpandedKeys(nextKeys);
}

function toggleExpanded(nodeKey: string): void {
  setExpanded(nodeKey, !isRowExpanded(nodeKey));
}

function treeIndentGuideOffsets(depth: number): number[] {
  return Array.from(
    { length: depth },
    (_, index) => index * TREE_INDENT_STEP + 8,
  );
}

function resetFilters(): void {
  searchQuery.value = '';
  activeStatusFilters.value = new Set();
}

function toggleStatusFilter(filterKey: StatusFilterKey): void {
  const next = new Set(activeStatusFilters.value);
  if (next.has(filterKey)) {
    next.delete(filterKey);
  } else {
    next.add(filterKey);
  }
  activeStatusFilters.value = next;
}

function getControlStatementParts(control: Control): Part[] {
  return (control.parts || []).filter(
    (part) => normalizeKey(part.name) === 'statement',
  );
}

function buildControlCatalogMap(
  catalog?: Catalog,
): Map<string, ControlCatalogEntry> {
  const map = new Map<string, ControlCatalogEntry>();
  if (!catalog) {
    return map;
  }

  const visitControl = (control: Control): void => {
    map.set(normalizeKey(control.id), {
      control,
      statementParts: getControlStatementParts(control),
    });

    (control.controls || []).forEach(visitControl);
  };

  const visitGroup = (group: Group): void => {
    (group.controls || []).forEach(visitControl);
    (group.groups || []).forEach(visitGroup);
  };

  (catalog.controls || []).forEach(visitControl);
  (catalog.groups || []).forEach(visitGroup);

  return map;
}

function buildGroupRollupMap(catalog?: Catalog): Map<string, GroupRollup> {
  const map = new Map<string, GroupRollup>();
  if (!catalog) {
    return map;
  }

  const createEmptyRollup = (): GroupRollup => ({
    controlCount: 0,
    componentTotal: 0,
    evidenceEntries: [],
    inProgressCount: 0,
  });

  const mergeEvidenceEntries = (
    existing: ProfileComplianceStatusCount[],
    incoming: ProfileComplianceStatusCount[],
  ): ProfileComplianceStatusCount[] => {
    const totals = new Map<string, number>();

    [...existing, ...incoming].forEach((entry) => {
      const key = normalizeKey(entry.status);
      totals.set(key, (totals.get(key) || 0) + entry.count);
    });

    return Array.from(totals.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  };

  const mergeRollups = (
    base: GroupRollup,
    incoming: GroupRollup,
  ): GroupRollup => ({
    controlCount: base.controlCount + incoming.controlCount,
    componentTotal: base.componentTotal + incoming.componentTotal,
    evidenceEntries: mergeEvidenceEntries(
      base.evidenceEntries,
      incoming.evidenceEntries,
    ),
    inProgressCount: base.inProgressCount + incoming.inProgressCount,
  });

  const visitControl = (control: Control): GroupRollup => {
    const entry = controlCatalogMap.value.get(normalizeKey(control.id)) || {
      control,
      statementParts: getControlStatementParts(control),
    };
    const requirement =
      requirementMap.value.get(normalizeKey(control.id)) || null;
    const state = controlState(control, requirement, entry.statementParts);

    let rollup: GroupRollup = {
      controlCount: 1,
      componentTotal: getRequirementComponentTotal(requirement),
      evidenceEntries: getControlEvidenceEntries(control.id),
      inProgressCount: state.filterKeys.has('in-progress') ? 1 : 0,
    };

    (control.controls || []).forEach((childControl) => {
      rollup = mergeRollups(rollup, visitControl(childControl));
    });

    return rollup;
  };

  const visitGroup = (group: Group): GroupRollup => {
    let rollup = createEmptyRollup();

    (group.controls || []).forEach((control) => {
      rollup = mergeRollups(rollup, visitControl(control));
    });

    (group.groups || []).forEach((childGroup) => {
      rollup = mergeRollups(rollup, visitGroup(childGroup));
    });

    map.set(normalizeKey(group.id), rollup);
    return rollup;
  };

  (catalog.groups || []).forEach(visitGroup);

  return map;
}

function getGroupRollup(group: Group): GroupRollup {
  return (
    groupRollupMap.value.get(normalizeKey(group.id)) || {
      controlCount: 0,
      componentTotal: 0,
      evidenceEntries: [],
      inProgressCount: 0,
    }
  );
}

function groupState(group: Group) {
  const rollup = getGroupRollup(group);

  if (rollup.controlCount === 0) {
    return {
      label: 'NO DATA',
      chipStatus: 'unknown',
    };
  }

  if (rollup.inProgressCount === 0) {
    return {
      label: 'NOT STARTED',
      chipStatus: 'unknown',
    };
  }

  if (rollup.inProgressCount === rollup.controlCount) {
    return {
      label: 'ALL STARTED',
      chipStatus: 'implemented',
    };
  }

  return {
    label: `${rollup.inProgressCount}/${rollup.controlCount} STARTED`,
    chipStatus: 'implemented',
  };
}

function describeStatementPart(part?: Part | null): string {
  if (!part) {
    return 'No statement description available.';
  }

  const label = String(
    part.props?.find((prop) => prop.name === 'label')?.value || '',
  ).trim();
  const prose = String(part.prose || '').trim();
  const title = String(part.title || '').trim();

  return label || prose || title || 'No statement description available.';
}

function getRequirementComponentTotal(
  requirement: ImplementedRequirement | null,
): number {
  if (!requirement) {
    return 0;
  }

  let total = requirement.byComponents?.length || 0;
  (requirement.statements || []).forEach((statement) => {
    total += statement.byComponents?.length || 0;
  });
  return total;
}

function getControlEvidenceEntries(
  controlId?: string,
): ProfileComplianceStatusCount[] {
  if (!controlId) {
    return [];
  }
  return (
    complianceControlMap.value.get(normalizeKey(controlId))?.statusCounts || []
  );
}

function hasImplementationContent(
  requirement: ImplementedRequirement | null,
): boolean {
  if (!requirement) {
    return false;
  }

  return Boolean(
    requirement.byComponents?.length ||
      requirement.statements?.length ||
      requirement.setParameters?.length ||
      requirement.props?.length ||
      requirement.links?.length ||
      String(requirement.remarks || '').trim(),
  );
}

function controlState(
  control: Control,
  requirement: ImplementedRequirement | null,
  statementParts: Part[],
) {
  const hasStatements = statementParts.length > 0;
  const implementationStarted = hasImplementationContent(requirement);
  const evidenceEntries = getControlEvidenceEntries(control.id);
  const hasEvidence =
    evidenceEntries.reduce((total, entry) => total + entry.count, 0) > 0;

  const filterKeys = new Set<StatusFilterKey>();
  if (implementationStarted) {
    filterKeys.add('in-progress');
  } else {
    filterKeys.add('not-started');
  }
  if (!hasEvidence) {
    filterKeys.add('needs-evidence');
  }

  if (!hasStatements) {
    return {
      label: 'NO STMT',
      chipStatus: 'unknown',
      filterKeys,
    };
  }

  if (implementationStarted) {
    return {
      label: 'IN PROGRESS',
      chipStatus: 'implemented',
      filterKeys,
    };
  }

  return {
    label: 'NOT STARTED',
    chipStatus: 'unknown',
    filterKeys,
  };
}

function statementState(statement: Statement | null) {
  if (statement) {
    return {
      label: 'IN PROGRESS',
      chipStatus: 'implemented',
    };
  }

  return {
    label: 'NOT STARTED',
    chipStatus: 'unknown',
  };
}

function clearWorkspaceSelection(): void {
  if (controlWorkspaceOpen.value || statementWorkspaceOpen.value) {
    return;
  }

  uiStore.setControlImplementationSelectedRequirementId(null);
  selectedStatementPartId.value = '';
  resetDashboardPanels();
}

function closeControlWorkspace(): void {
  controlWorkspaceOpen.value = false;
  clearWorkspaceSelection();
}

function closeStatementWorkspace(): void {
  statementWorkspaceOpen.value = false;
  clearWorkspaceSelection();
}

function statementMatchesSearch(control: Control, part: Part): boolean {
  if (!normalizedSearch.value) {
    return true;
  }

  const haystack = [
    control.id,
    control.title,
    part.id,
    part.title,
    describeStatementPart(part),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedSearch.value);
}

function buildVisibleRows(treeNodes: TreeNode[], depth = 0): ControlsTreeRow[] {
  const rows: ControlsTreeRow[] = [];

  for (const node of treeNodes) {
    if (node.type === 'group') {
      const childRows = buildVisibleRows(node.children || [], depth + 1);
      const matchesGroupSearch =
        !normalizedSearch.value ||
        [node.data.id, node.data.title]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch.value);

      const hasMatchingDescendants = childRows.length > 0;
      const hasActiveStatusFilters = activeStatusFilters.value.size > 0;

      if (!matchesGroupSearch && !hasMatchingDescendants) {
        continue;
      }

      if (hasActiveStatusFilters && !hasMatchingDescendants) {
        continue;
      }

      rows.push({
        type: 'group',
        key: `group:${node.key}`,
        nodeKey: `group:${node.key}`,
        depth,
        group: node.data as Group,
      });

      if (isRowExpanded(`group:${node.key}`)) {
        rows.push(...childRows);
      }
      continue;
    }

    const control = node.data as Control;
    const requirement =
      requirementMap.value.get(normalizeKey(control.id)) || null;
    const statementParts = getControlStatementParts(control);
    const childRows = buildVisibleRows(node.children || [], depth + 1);

    const selfSearchMatch =
      !normalizedSearch.value ||
      [control.id, control.title]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch.value) ||
      statementParts.some((part) => statementMatchesSearch(control, part));

    const controlStatus = controlState(control, requirement, statementParts);
    const matchesStatusFilters =
      activeStatusFilters.value.size === 0 ||
      [...activeStatusFilters.value].some((filterKey) =>
        controlStatus.filterKeys.has(filterKey),
      );

    if (!selfSearchMatch && childRows.length === 0) {
      continue;
    }

    if (!matchesStatusFilters && childRows.length === 0) {
      continue;
    }

    rows.push({
      type: 'control',
      key: `control:${control.id}`,
      nodeKey: `control:${control.id}`,
      depth,
      control,
      requirement,
      statementParts,
    });

    if (isRowExpanded(`control:${control.id}`)) {
      const statementMap: Record<string, Statement | undefined> = {};
      (requirement?.statements || []).forEach((statement) => {
        statementMap[statement.statementId] = statement;
      });

      statementParts.forEach((statementPart) => {
        if (
          normalizedSearch.value &&
          !statementMatchesSearch(control, statementPart)
        ) {
          return;
        }

        const statement =
          requirement?.statements?.find(
            (candidate) =>
              normalizeKey(candidate.statementId) ===
              normalizeKey(statementPart.id),
          ) || null;
        const statementKey = `statement:${control.id}:${statementPart.id}`;
        rows.push({
          type: 'statement',
          key: statementKey,
          nodeKey: statementKey,
          depth: depth + 1,
          control,
          requirement,
          statementPart,
          statement,
        });

        if (isRowExpanded(statementKey)) {
          rows.push({
            type: 'detail',
            key: `${statementKey}:detail`,
            depth: depth + 2,
            control,
            statementPart,
            statementMap,
          });
        }
      });

      rows.push(...childRows);
    }
  }

  return rows;
}

async function reloadControls(): Promise<void> {
  profileMissing.value = false;
  loadErrorMessage.value = null;
  resolvedCatalogData.value = undefined;
  controlImplementationData.value = undefined;
  systemComponentsData.value = undefined;
  profileData.value = undefined;
  nodes.value = [];
  existingDashboards.value = [];
  allDashboards.value = [];
  uiStore.setControlImplementationSelectedRequirementId(null);

  if (!activeSspId.value) {
    return;
  }

  isReloading.value = true;

  try {
    await executeProfile(
      `/api/oscal/system-security-plans/${activeSspId.value}/profile`,
    );
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 404) {
      profileMissing.value = true;
      isReloading.value = false;
      return;
    }

    loadErrorMessage.value = resolveApiErrorMessage(
      error,
      'Unable to load the active profile for Controls.',
    );
    isReloading.value = false;
    return;
  }

  const activeProfile = profileData.value as { uuid?: string } | undefined;
  const activeProfileId = String(activeProfile?.uuid || '').trim();

  if (!activeProfileId) {
    profileMissing.value = true;
    isReloading.value = false;
    return;
  }

  const results = await Promise.allSettled([
    executeResolvedCatalog(`/api/oscal/profiles/${activeProfileId}/resolved`),
    executeControlImplementation(
      `/api/oscal/system-security-plans/${activeSspId.value}/control-implementation`,
    ),
    executeSystemComponents(
      `/api/oscal/system-security-plans/${activeSspId.value}/system-implementation/components`,
    ),
    loadCompliance({
      includeControls: true,
      sspId: activeSspId.value,
    }),
  ]);

  const firstFailure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (firstFailure) {
    loadErrorMessage.value = resolveApiErrorMessage(
      firstFailure.reason,
      'Unable to load controls for the active workspace.',
    );
  }

  isReloading.value = false;
}

async function ensureRequirementForControl(
  control: Control,
): Promise<ImplementedRequirement | null> {
  const existing = requirementMap.value.get(normalizeKey(control.id)) || null;
  if (existing) {
    return existing;
  }

  if (!activeSspId.value) {
    return null;
  }

  try {
    await executeCreateRequirement(
      `/api/oscal/system-security-plans/${activeSspId.value}/control-implementation/implemented-requirements`,
      {
        data: {
          uuid: crypto.randomUUID(),
          controlId: control.id,
        },
      },
    );

    const created =
      createdRequirementData.value ||
      requirementMap.value.get(normalizeKey(control.id)) ||
      null;

    if (created) {
      if (!controlImplementationData.value) {
        controlImplementationData.value = {
          description: '',
          implementedRequirements: [created],
        };
      } else {
        controlImplementationData.value.implementedRequirements = [
          ...(controlImplementationData.value.implementedRequirements || []),
          created,
        ];
      }
      return created;
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Unable to open requirement',
      detail: resolveApiErrorMessage(
        error,
        'The requirement could not be created for this control.',
      ),
      life: 4000,
    });
  }

  return null;
}

async function openControlWorkspace(control: Control): Promise<void> {
  const requirement = await ensureRequirementForControl(control);
  if (!requirement) {
    return;
  }

  uiStore.setControlImplementationSelectedRequirementId(requirement.uuid);
  statementWorkspaceOpen.value = false;
  controlWorkspaceOpen.value = true;
  resetDashboardPanels();
  setExpanded(`control:${control.id}`, true);
}

async function openStatementWorkspace(
  control: Control,
  part: Part,
  expandedStatementPart: Part = part,
): Promise<void> {
  const requirement = await ensureRequirementForControl(control);
  if (!requirement) {
    return;
  }

  uiStore.setControlImplementationSelectedRequirementId(requirement.uuid);
  controlWorkspaceOpen.value = false;
  statementWorkspaceOpen.value = true;
  resetDashboardPanels();
  selectedStatementPartId.value = part.id || '';
  setExpanded(`control:${control.id}`, true);

  if (expandedStatementPart.id) {
    setExpanded(`statement:${control.id}:${expandedStatementPart.id}`, true);
  }
}

async function handleStatementAction(
  control: Control,
  part: Part,
): Promise<void> {
  await openStatementWorkspace(control, part);
}

async function handleStatementDetailAction(
  control: Control,
  statementPart: Part,
  targetPart: Part,
): Promise<void> {
  if (!targetPart.id) {
    return;
  }

  await openStatementWorkspace(control, targetPart, statementPart);
}

function openCreateStatementModal(part: Part): void {
  if (!selectedRequirement.value) {
    return;
  }

  editingRequirement.value = selectedRequirement.value;
  editingStatement.value = null;
  suggestedStatementId.value = String(part.id || '');
  showCreateStatementModal.value = true;
}

function openEditStatementModal(statement: Statement): void {
  if (!selectedRequirement.value) {
    return;
  }

  editingRequirement.value = selectedRequirement.value;
  editingStatement.value = statement;
  showEditStatementModal.value = true;
}

function openCreateStatementByComponentModal(): void {
  if (!selectedRequirement.value || !selectedStatementRecord.value) {
    return;
  }

  preferredComponentUuid.value = '';
  editingRequirement.value = selectedRequirement.value;
  editingStatement.value = selectedStatementRecord.value;
  showCreateStatementByComponentModal.value = true;
}

function openEditStatementByComponentModal(byComponent: ByComponent): void {
  if (!selectedRequirement.value || !selectedStatementRecord.value) {
    return;
  }

  editingRequirement.value = selectedRequirement.value;
  editingStatement.value = selectedStatementRecord.value;
  editingByComponent.value = byComponent;
  showEditStatementByComponentModal.value = true;
}

function openEditRequirementByComponentModal(byComponent: ByComponent): void {
  if (!selectedRequirement.value) {
    return;
  }

  editingRequirement.value = selectedRequirement.value;
  editingByComponent.value = byComponent;
  showEditRequirementByComponentModal.value = true;
}

function openCreateComponentModal(context: ComponentFlowContext): void {
  componentFlowContext.value = context;
  showCreateComponentModal.value = true;
}

function updateRequirementInCollection(
  updatedRequirement: ImplementedRequirement,
): void {
  if (!controlImplementationData.value?.implementedRequirements) {
    return;
  }

  controlImplementationData.value.implementedRequirements =
    controlImplementationData.value.implementedRequirements.map(
      (requirement) =>
        requirement.uuid === updatedRequirement.uuid
          ? updatedRequirement
          : requirement,
    );
}

function handleStatementCreated(statement: Statement): void {
  if (!selectedRequirement.value) {
    return;
  }

  const updatedRequirement = cloneRequirement(selectedRequirement.value);
  updatedRequirement.statements = [
    ...(updatedRequirement.statements || []),
    statement,
  ];
  updateRequirementInCollection(updatedRequirement);

  uiStore.setControlImplementationSelectedRequirementId(
    updatedRequirement.uuid,
  );
  selectedStatementPartId.value = statement.statementId;
  showCreateStatementModal.value = false;
}

function handleStatementSaved(statement: Statement): void {
  if (!selectedRequirement.value) {
    return;
  }

  const updatedRequirement = cloneRequirement(selectedRequirement.value);
  updatedRequirement.statements = (updatedRequirement.statements || []).map(
    (candidate) => (candidate.uuid === statement.uuid ? statement : candidate),
  );
  updateRequirementInCollection(updatedRequirement);

  uiStore.setControlImplementationSelectedRequirementId(
    updatedRequirement.uuid,
  );
  showEditStatementModal.value = false;
}

function handleStatementByComponentCreated(byComponent: ByComponent): void {
  if (!selectedRequirement.value || !selectedStatementRecord.value) {
    return;
  }

  const updatedRequirement = cloneRequirement(selectedRequirement.value);
  updatedRequirement.statements = (updatedRequirement.statements || []).map(
    (statement) =>
      statement.uuid === selectedStatementRecord.value?.uuid
        ? {
            ...statement,
            byComponents: [...(statement.byComponents || []), byComponent],
          }
        : statement,
  );
  updateRequirementInCollection(updatedRequirement);

  preferredComponentUuid.value = '';
  showCreateStatementByComponentModal.value = false;
}

function handleStatementByComponentSaved(byComponent: ByComponent): void {
  if (!selectedRequirement.value || !selectedStatementRecord.value) {
    return;
  }

  const updatedRequirement = cloneRequirement(selectedRequirement.value);
  updatedRequirement.statements = (updatedRequirement.statements || []).map(
    (statement) =>
      statement.uuid === selectedStatementRecord.value?.uuid
        ? {
            ...statement,
            byComponents: (statement.byComponents || []).map((candidate) =>
              candidate.uuid === byComponent.uuid ? byComponent : candidate,
            ),
          }
        : statement,
  );
  updateRequirementInCollection(updatedRequirement);

  showEditStatementByComponentModal.value = false;
}

function handleRequirementByComponentSaved(byComponent: ByComponent): void {
  if (!selectedRequirement.value) {
    return;
  }

  const updatedRequirement = cloneRequirement(selectedRequirement.value);
  updatedRequirement.byComponents = (updatedRequirement.byComponents || []).map(
    (candidate) =>
      candidate.uuid === byComponent.uuid ? byComponent : candidate,
  );
  updateRequirementInCollection(updatedRequirement);

  showEditRequirementByComponentModal.value = false;
}

function cloneRequirement(
  requirement: ImplementedRequirement,
): ImplementedRequirement {
  return cloneValue(requirement);
}

function resolveComponentTitle(componentUuid?: string): string {
  const component = (systemComponentsData.value || []).find(
    (candidate) => normalizeKey(candidate.uuid) === normalizeKey(componentUuid),
  );
  return component?.title || componentUuid || 'Unknown Component';
}

function formatImplementationState(state?: string): string {
  return String(state || 'unknown')
    .replace(/[-_]/g, ' ')
    .trim()
    .toUpperCase();
}

async function confirmDeleteStatementByComponent(
  byComponent: ByComponent,
): Promise<void> {
  if (
    !selectedRequirement.value ||
    !selectedStatementRecord.value ||
    !activeSspId.value
  ) {
    return;
  }

  confirmDeleteDialog(() => deleteStatementByComponent(byComponent), {
    itemName: resolveComponentTitle(byComponent.componentUuid),
    itemType: 'by-component implementation',
  });
}

async function deleteStatementByComponent(
  byComponent: ByComponent,
): Promise<void> {
  if (
    !selectedRequirement.value ||
    !selectedStatementRecord.value ||
    !activeSspId.value
  ) {
    return;
  }

  try {
    await executeDeleteStatementByComponent(
      `/api/oscal/system-security-plans/${activeSspId.value}/control-implementation/implemented-requirements/${selectedRequirement.value.uuid}/statements/${selectedStatementRecord.value.uuid}/by-components/${byComponent.uuid}`,
    );

    const updatedRequirement = cloneRequirement(selectedRequirement.value);
    updatedRequirement.statements = (updatedRequirement.statements || []).map(
      (statement) =>
        statement.uuid === selectedStatementRecord.value?.uuid
          ? {
              ...statement,
              byComponents: (statement.byComponents || []).filter(
                (candidate) => candidate.uuid !== byComponent.uuid,
              ),
            }
          : statement,
    );
    updateRequirementInCollection(updatedRequirement);

    toast.add({
      severity: 'success',
      summary: 'Component Removed',
      detail: 'The statement component implementation was deleted.',
      life: 2500,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: resolveApiErrorMessage(
        error,
        'Unable to delete the statement component implementation.',
      ),
      life: 4000,
    });
  }
}

function resetDashboardPanels(): void {
  showCreateDashboardForm.value = false;
  showLinkDashboardForm.value = false;
  selectedDashboardToLink.value = null;
  evidenceDashboard.value = { name: '', filter: '' };
  selectedBaselineEvidence.value = null;
  labelConditions.value = [];
  newLabelName.value = '';
  newLabelValue.value = '';
}

function resetDashboardCreateForm(): void {
  showCreateDashboardForm.value = false;
  evidenceDashboard.value = { name: '', filter: '' };
  selectedBaselineEvidence.value = null;
  labelConditions.value = [];
  newLabelName.value = '';
  newLabelValue.value = '';
}

function resetDashboardLinkForm(): void {
  showLinkDashboardForm.value = false;
  selectedDashboardToLink.value = null;
}

function toggleCreateDashboardForm(): void {
  showCreateDashboardForm.value = !showCreateDashboardForm.value;
  if (showCreateDashboardForm.value) {
    showLinkDashboardForm.value = false;
  }
}

function toggleLinkDashboardForm(): void {
  showLinkDashboardForm.value = !showLinkDashboardForm.value;
  if (showLinkDashboardForm.value) {
    showCreateDashboardForm.value = false;
  }
}

async function loadAvailableEvidence(): Promise<void> {
  if (availableEvidence.value.length > 0) {
    return;
  }

  evidenceLoading.value = true;
  try {
    await executeEvidenceSearch({
      data: { filter: {} },
    });

    const evidenceList = evidenceSearchData.value || [];
    availableEvidence.value = evidenceList
      .filter((entry) => entry.labels && entry.labels.length > 0)
      .map((entry) => ({
        ...entry,
        searchText: [
          entry.title,
          ...(entry.labels?.map((label) => `${label.name} ${label.value}`) ||
            []),
        ].join(' '),
      }));
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Evidence Load Failed',
      detail: resolveApiErrorMessage(
        error,
        'Unable to load evidence choices for dashboard creation.',
      ),
      life: 4000,
    });
  } finally {
    evidenceLoading.value = false;
  }
}

function addLabelCondition(): void {
  if (!newLabelName.value || !newLabelValue.value) {
    return;
  }

  const exists = labelConditions.value.some(
    (condition) =>
      condition.name === newLabelName.value &&
      condition.value === newLabelValue.value,
  );
  if (!exists) {
    labelConditions.value.push({
      name: newLabelName.value,
      value: newLabelValue.value,
    });
  }

  newLabelName.value = '';
  newLabelValue.value = '';
}

function removeLabelCondition(index: number): void {
  labelConditions.value.splice(index, 1);
}

async function submitDashboardCreate(): Promise<void> {
  if (!selectedRequirement.value?.controlId || !computedFilter.value) {
    return;
  }

  let parsedFilter: DashboardCreate['filter'];
  try {
    parsedFilter = new FilterParser(computedFilter.value).parse();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Filter',
      detail: resolveApiErrorMessage(
        error,
        'The generated dashboard filter could not be parsed.',
      ),
      life: 4000,
    });
    return;
  }

  try {
    await executeCreateDashboard('/api/filters', {
      data: {
        name: evidenceDashboard.value.name,
        filter: parsedFilter,
        controls: [selectedRequirement.value.controlId],
        components: [],
      } satisfies DashboardCreate,
    });

    toast.add({
      severity: 'success',
      summary: 'Dashboard Created',
      detail: 'The control-linked dashboard was created successfully.',
      life: 2500,
    });

    resetDashboardCreateForm();
    await loadDashboardsForControl(selectedRequirement.value.controlId);
    await loadAllDashboards();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Create Failed',
      detail: resolveApiErrorMessage(
        error,
        'Unable to create the dashboard for this control.',
      ),
      life: 4000,
    });
  }
}

async function loadDashboardsForControl(controlId: string): Promise<void> {
  try {
    await executeFetchDashboardsByControl(
      `/api/filters?controlId=${controlId}`,
    );
    existingDashboards.value = dashboardsByControlData.value || [];
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Dashboard Load Failed',
      detail: resolveApiErrorMessage(
        error,
        'Unable to load linked dashboards for this control.',
      ),
      life: 4000,
    });
  }
}

async function loadAllDashboards(): Promise<void> {
  try {
    await executeFetchAllDashboards('/api/filters');
    allDashboards.value = allDashboardsData.value || [];
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Dashboard Load Failed',
      detail: resolveApiErrorMessage(
        error,
        'Unable to load available dashboards.',
      ),
      life: 4000,
    });
  }
}

async function linkExistingDashboard(): Promise<void> {
  if (
    !selectedRequirement.value?.controlId ||
    !selectedDashboardToLink.value?.id
  ) {
    return;
  }

  const dashboard = selectedDashboardToLink.value;
  const nextControlIds = [
    ...(dashboard.controls?.map((control) => control.id) || []),
    selectedRequirement.value.controlId,
  ];

  try {
    await executeUpdateDashboard(`/api/filters/${dashboard.id}`, {
      data: {
        name: dashboard.name,
        filter: dashboard.filter,
        controls: nextControlIds,
      },
    });

    toast.add({
      severity: 'success',
      summary: 'Dashboard Linked',
      detail: `${dashboard.name} is now linked to the selected control.`,
      life: 2500,
    });

    resetDashboardLinkForm();
    await loadDashboardsForControl(selectedRequirement.value.controlId);
    await loadAllDashboards();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Link Failed',
      detail: resolveApiErrorMessage(
        error,
        'Unable to link the selected dashboard.',
      ),
      life: 4000,
    });
  }
}

async function confirmUnlinkDashboard(dashboard: Dashboard): Promise<void> {
  confirmDeleteDialog(() => unlinkDashboard(dashboard), {
    itemName: dashboard.name,
    itemType: 'dashboard link',
  });
}

async function unlinkDashboard(dashboard: Dashboard): Promise<void> {
  if (!dashboard.id || !selectedRequirement.value?.controlId) {
    return;
  }

  const nextControlIds =
    dashboard.controls
      ?.filter((control) => control.id !== selectedRequirement.value?.controlId)
      .map((control) => control.id) || [];

  try {
    await executeUpdateDashboard(`/api/filters/${dashboard.id}`, {
      data: {
        name: dashboard.name,
        filter: dashboard.filter,
        controls: nextControlIds,
      },
    });

    toast.add({
      severity: 'success',
      summary: 'Dashboard Unlinked',
      detail: `${dashboard.name} was removed from the selected control.`,
      life: 2500,
    });

    await loadDashboardsForControl(selectedRequirement.value.controlId);
    await loadAllDashboards();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Unlink Failed',
      detail: resolveApiErrorMessage(error, 'Unable to unlink the dashboard.'),
      life: 4000,
    });
  }
}

function filterToString(filter: Dashboard['filter'] | undefined): string {
  function scopeToString(
    scope: NonNullable<Dashboard['filter']>['scope'] | undefined,
    path = 'scope',
  ): string {
    if (!scope) {
      throw new Error(`Invalid filter: missing ${path}.`);
    }

    if (scope.condition) {
      const { label, operator, value } = scope.condition;
      if (!label || !operator || !value) {
        throw new Error(`Malformed condition at ${path}.`);
      }
      return `${label}${operator}${value}`;
    }

    if (scope.query) {
      const operator = scope.query.operator?.trim().length
        ? scope.query.operator
        : 'and';
      const scopes = scope.query.scopes?.filter(Boolean) || [];
      if (!scopes.length) {
        throw new Error(`Query at ${path} has no scopes.`);
      }

      const parts = scopes.map((childScope, index) =>
        scopeToString(childScope, `${path}.query.scopes[${index}]`),
      );
      const joined = parts.join(` ${operator} `);
      return parts.length > 1 ? `(${joined})` : joined;
    }

    throw new Error(`Scope at ${path} is missing both condition and query.`);
  }

  if (!filter?.scope) {
    throw new Error('Filter is missing a valid scope.');
  }

  return scopeToString(filter.scope);
}

function viewDashboardEvidence(dashboard: Dashboard): void {
  try {
    const filter = filterToString(dashboard.filter);
    router.push({
      name: 'evidence:index',
      query: { filter },
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Dashboard Filter',
      detail: resolveApiErrorMessage(
        error,
        'Unable to open evidence because the dashboard filter is invalid.',
      ),
      life: 4000,
    });
  }
}

function handleSystemComponentCreated(component: SystemComponent): void {
  systemComponentsData.value = [
    ...(systemComponentsData.value || []),
    component,
  ];
  preferredComponentUuid.value = component.uuid || '';
  showCreateComponentModal.value = false;

  if (
    componentFlowContext.value === 'statement' &&
    selectedStatementRecord.value
  ) {
    editingRequirement.value = selectedRequirement.value;
    editingStatement.value = selectedStatementRecord.value;
    showCreateStatementByComponentModal.value = true;
  }

  toast.add({
    severity: 'success',
    summary: 'System Component Created',
    detail:
      componentFlowContext.value === 'statement'
        ? 'The new component is available in the statement by-component form.'
        : 'The new component is available for future by-component mappings.',
    life: 3000,
  });
}
</script>
