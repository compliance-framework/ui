<template>
  <div class="space-y-4">
    <div
      class="flex h-11 overflow-x-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
    >
      <button
        v-for="tab in implementationTabs"
        :key="tab.key"
        type="button"
        class="group flex min-w-[180px] flex-1 flex-col border-r border-[var(--ui-v2-border)] last:border-r-0"
        :class="
          innerTab === tab.key
            ? 'bg-[var(--ui-v2-primary-tint-15)]'
            : 'bg-[var(--ui-v2-card)]'
        "
        @click="setInnerTab(tab.key)"
      >
        <span
          class="ui-v2-nav flex h-full items-center justify-center px-3 py-2.5 text-[11px] font-bold tracking-[1px]"
          :class="
            innerTab === tab.key
              ? 'text-[var(--ui-v2-foreground)]'
              : 'text-[var(--ui-v2-secondary-foreground)]'
          "
        >
          {{ tab.label }}
        </span>
        <span
          class="w-full"
          :class="
            innerTab === tab.key
              ? 'h-[3px] bg-[var(--ui-v2-primary)]'
              : 'h-px bg-[var(--ui-v2-border)]'
          "
        />
      </button>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-4">
        <section
          v-if="innerTab === 'overview'"
          class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
        >
          <div
            v-if="isOverviewLoading"
            class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-5 py-6"
          >
            <p
              class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              LOADING
            </p>
            <p class="text-[var(--ui-v2-muted-foreground)]">
              Loading system implementation overview...
            </p>
          </div>

          <div
            v-else-if="overviewErrorMessage"
            class="space-y-3 border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-5 py-6"
          >
            <p
              class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-error)]"
            >
              LOAD FAILED
            </p>
            <p class="text-[var(--ui-v2-foreground)]">
              {{ overviewErrorMessage }}
            </p>
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center bg-[var(--ui-v2-primary)] px-3 text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-primary-foreground)]"
              @click="reloadOverview"
            >
              RETRY
            </button>
          </div>

          <div v-else class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <p
                class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
              >
                SYSTEM IMPLEMENTATION OVERVIEW
              </p>

              <button
                type="button"
                class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                :disabled="!systemImplementation"
                @click="openOverviewEditor"
              >
                EDIT
              </button>
            </div>

            <div class="space-y-4">
              <section class="space-y-0.5">
                <p
                  class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                >
                  REMARKS
                </p>
                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
                >
                  {{
                    systemImplementation?.remarks ||
                    'Describe the system implementation and any additional remarks.'
                  }}
                </p>
              </section>

              <div
                class="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
              >
                <section class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <p
                      class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      PROPERTIES
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      {{ overviewProperties.length }} TOTAL
                    </p>
                  </div>

                  <p
                    v-if="overviewProperties.length === 0"
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                  >
                    No properties defined. Use Edit to add properties.
                  </p>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(property, index) in overviewProperties"
                      :key="`${property.name || 'property'}-${index}`"
                      class="flex min-w-0 items-start gap-2.5"
                    >
                      <span
                        class="inline-flex max-w-[240px] shrink-0 truncate bg-[var(--ui-v2-primary-tint-10)] px-2 py-1 font-[var(--ui-v2-font-secondary)] text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                        :title="property.name || 'UNNAMED PROPERTY'"
                      >
                        {{ property.name || 'UNNAMED PROPERTY' }}
                      </span>
                      <p
                        class="min-w-0 break-words font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                      >
                        {{ property.value || 'none' }}
                      </p>
                    </div>
                  </div>
                </section>

                <section class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <p
                      class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      LINKS
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      {{ overviewLinks.length }} TOTAL
                    </p>
                  </div>

                  <p
                    v-if="overviewLinks.length === 0"
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                  >
                    No links defined. Use Edit to add links.
                  </p>

                  <div v-else class="space-y-2">
                    <div
                      v-for="(link, index) in overviewLinks"
                      :key="`${link.href || 'link'}-${index}`"
                      class="space-y-0.5"
                    >
                      <a
                        v-if="link.href"
                        class="ui-v2-link break-all font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px]"
                        :href="link.href"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ link.href }}
                      </a>
                      <p
                        v-else
                        class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                      >
                        {{ link.text || 'none' }}
                      </p>

                      <p
                        class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-tertiary-foreground)]"
                      >
                        <span v-if="link.text">TEXT: {{ link.text }}</span>
                        <span v-if="link.rel">
                          <span v-if="link.text"> / </span>REL: {{ link.rel }}
                        </span>
                        <span v-if="!link.text && !link.rel"
                          >no link metadata</span
                        >
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <section
          v-else-if="innerTab === 'users'"
          class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
        >
          <div class="flex items-center justify-between gap-3">
            <p
              class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
            >
              SYSTEM USERS
            </p>

            <button
              type="button"
              class="inline-flex h-9 items-center justify-center bg-[var(--ui-v2-primary)] px-3 text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-primary-foreground)]"
              @click="createUser"
            >
              CREATE USER
            </button>
          </div>

          <div
            v-if="isUsersLoading"
            class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
            >
              Loading users...
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              Fetching users and privileges for this SSP.
            </p>
          </div>

          <div
            v-else-if="usersErrorMessage"
            class="flex flex-col items-center justify-center gap-2 border border-[#d20f3940] bg-[#d20f3915] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-error)]"
            >
              Unable to load users.
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[#b52134]"
            >
              Check API availability and retry.
            </p>
          </div>

          <div
            v-else-if="usersCount === 0"
            class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
            >
              No system users defined.
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              Create a user to document roles and privileges.
            </p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="user in users"
              :key="user.uuid"
              class="space-y-2.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-2.5 py-2"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <p
                    class="truncate font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ formatUserHeading(user) }}
                  </p>
                  <p
                    v-if="user.shortName"
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    ({{ user.shortName.toUpperCase() }})
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                    @click="editUser(user)"
                  >
                    EDIT
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
                    @click="downloadUserJSON(user)"
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-error)]"
                    @click="
                      confirmDeleteDialog(() => deleteUser(user), {
                        itemName: user.title || 'User',
                        itemType: 'user',
                      })
                    "
                  >
                    DELETE
                  </button>
                </div>
              </div>

              <div class="space-y-2.5">
                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[12px] text-[var(--ui-v2-muted-foreground)]"
                >
                  {{ user.description || 'No description provided.' }}
                </p>

                <div class="space-y-1">
                  <p
                    class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    ROLES
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ formatUserRoles(user) }}
                  </p>
                </div>

                <div v-if="user.authorizedPrivileges?.length" class="space-y-1">
                  <p
                    class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    AUTHORIZED PRIVILEGES
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ formatUserPrivileges(user) }}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          v-else-if="innerTab === 'components'"
          class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
        >
          <div class="flex items-center justify-between gap-3">
            <p
              class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
            >
              SYSTEM COMPONENTS
            </p>

            <button
              type="button"
              class="inline-flex h-9 items-center justify-center bg-[var(--ui-v2-primary)] px-3 text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-primary-foreground)]"
              @click="createComponent"
            >
              CREATE COMPONENT
            </button>
          </div>

          <div
            v-if="isComponentsLoading"
            class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
            >
              Loading components...
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              Fetching component status and protocol details.
            </p>
          </div>

          <div
            v-else-if="componentsErrorMessage"
            class="flex flex-col items-center justify-center gap-2 border border-[#d20f3940] bg-[#d20f3915] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-error)]"
            >
              Unable to load components.
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[#b52134]"
            >
              Check API availability and retry.
            </p>
          </div>

          <div
            v-else-if="componentsCount === 0"
            class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
            >
              No system components defined.
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              Create a component to capture implementation details.
            </p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="component in components"
              :key="component.uuid"
              class="space-y-2.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-2.5 py-2"
              >
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <p
                    class="truncate font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ formatComponentHeading(component) }}
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px]"
                    :style="{
                      color: componentTypeColor(
                        component.type || 'unspecified',
                      ),
                    }"
                  >
                    {{
                      formatComponentType(
                        component.type || 'unspecified',
                      ).toUpperCase()
                    }}
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px]"
                    :style="{
                      color: componentStatusColor(component.status?.state),
                    }"
                  >
                    {{ (component.status?.state || 'unknown').toUpperCase() }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                    @click="editComponent(component)"
                  >
                    EDIT
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
                    @click="downloadComponentJSON(component)"
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-error)]"
                    @click="
                      confirmDeleteDialog(() => deleteComponent(component), {
                        itemName: component.title,
                        itemType: 'component',
                      })
                    "
                  >
                    DELETE
                  </button>
                </div>
              </div>

              <div class="space-y-2.5">
                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[12px] text-[var(--ui-v2-muted-foreground)]"
                >
                  {{ component.description || 'No description provided.' }}
                </p>

                <div v-if="component.purpose" class="space-y-1">
                  <p
                    class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    PURPOSE
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ component.purpose }}
                  </p>
                </div>

                <div v-if="component.protocols?.length" class="space-y-1">
                  <p
                    class="ui-v2-nav text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    PROTOCOLS
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ formatProtocols(component) }}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          v-else
          class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
        >
          <div class="flex items-center justify-between gap-3">
            <p
              class="font-[var(--ui-v2-font-primary)] text-[18px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
            >
              LEVERAGED AUTHORIZATIONS
            </p>

            <button
              type="button"
              class="inline-flex h-9 items-center justify-center bg-[var(--ui-v2-primary)] px-3 text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-primary-foreground)]"
              @click="createLeveragedAuthorization"
            >
              CREATE AUTHORIZATION
            </button>
          </div>

          <div
            v-if="isAuthorizationsLoading"
            class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
            >
              Loading leveraged authorizations...
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              Fetching linked authorizations for this SSP.
            </p>
          </div>

          <div
            v-else-if="authorizationsErrorMessage"
            class="flex flex-col items-center justify-center gap-2 border border-[#d20f3940] bg-[#d20f3915] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-error)]"
            >
              Unable to load leveraged authorizations.
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[#b52134]"
            >
              Check API availability and retry.
            </p>
          </div>

          <div
            v-else-if="leveragedAuthorizationsCount === 0"
            class="flex flex-col items-center justify-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-5 py-6 text-center"
          >
            <p
              class="font-[var(--ui-v2-font-primary)] text-[20px] font-bold text-[var(--ui-v2-foreground)]"
            >
              No leveraged authorizations defined.
            </p>
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
            >
              Create an authorization to document external inheritance.
            </p>
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="auth in leveragedAuthorizations"
              :key="auth.uuid"
              class="space-y-2.5 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-2.5 py-2"
              >
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <p
                    class="truncate font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ formatAuthorizationHeading(auth) }}
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-success)]"
                  >
                    {{ formatDateStamp(auth.dateAuthorized) }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-foreground)]"
                    @click="editLeveragedAuth(auth)"
                  >
                    EDIT
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-2.5 text-[10px] font-bold tracking-[1px] text-[var(--ui-v2-muted-foreground)]"
                    @click="downloadLeveragedAuthJSON(auth)"
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 items-center justify-center border border-[#d20f39] bg-[#d20f3910] px-2.5 text-[10px] font-bold tracking-[1px] text-[#d20f39]"
                    @click="
                      confirmDeleteDialog(() => deleteLeveragedAuth(auth), {
                        itemName: auth.title,
                        itemType: 'leveraged authorization',
                      })
                    "
                  >
                    DELETE
                  </button>
                </div>
              </div>

              <div class="space-y-2.5">
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-1">
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      PARTY UUID
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                    >
                      {{ shortUuid(auth.partyUuid) }}
                    </p>
                  </div>

                  <div class="space-y-1">
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                    >
                      DATE AUTHORIZED
                    </p>
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                    >
                      {{ formatDateStamp(auth.dateAuthorized) }}
                    </p>
                  </div>
                </div>

                <div class="space-y-1">
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    REMARKS
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ auth.remarks || 'none' }}
                  </p>
                </div>

                <div class="space-y-1">
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                  >
                    PROPERTIES
                  </p>
                  <p
                    class="font-[var(--ui-v2-font-secondary)] text-[11px] font-semibold tracking-[1px] text-[var(--ui-v2-foreground)]"
                  >
                    {{ formatAuthorizationProps(auth) }}
                  </p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>

      <aside
        class="h-fit space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-5"
      >
        <div class="space-y-0.5">
          <p
            class="font-[var(--ui-v2-font-primary)] text-[12px] font-bold tracking-[0.5px] text-[var(--ui-v2-foreground)]"
          >
            COMPONENT TYPE DISTRIBUTION
          </p>
          <p
            class="font-[var(--ui-v2-font-secondary)] text-[10px] font-semibold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
          >
            {{ componentsCount }} TOTAL COMPONENTS
          </p>
        </div>

        <div class="space-y-2">
          <div
            v-for="distribution in componentTypeDistribution"
            :key="distribution.type"
            class="space-y-1"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
              >
                {{ distribution.label }}
              </span>
              <span
                class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold tracking-[1px]"
                :style="{ color: toneColor(distribution.tone) }"
              >
                {{ distribution.count }} ({{ distribution.percentage }}%)
              </span>
            </div>
            <div
              class="h-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
            >
              <div
                class="h-full"
                :style="{
                  width: `${distribution.percentage}%`,
                  backgroundColor: toneColor(distribution.tone),
                }"
              />
            </div>
          </div>
        </div>
      </aside>
    </div>

    <Dialog
      v-model:visible="showOverviewEditorModal"
      modal
      header="Edit System Implementation Overview"
      size="lg"
    >
      <SystemImplementationOverviewForm
        v-if="systemImplementation"
        :ssp-id="sspId"
        :system-implementation="systemImplementation"
        @saved="handleOverviewSaved"
      />
    </Dialog>

    <Dialog
      v-model:visible="showCreateUserModal"
      modal
      header="Create User"
      size="lg"
    >
      <SystemImplementationUserCreateForm
        :ssp-id="sspId"
        @cancel="showCreateUserModal = false"
        @created="handleUserCreated"
      />
    </Dialog>

    <Dialog
      v-model:visible="showEditUserModal"
      modal
      header="Edit User"
      size="lg"
    >
      <SystemImplementationUserEditForm
        v-if="editingUser"
        :ssp-id="sspId"
        :user="editingUser"
        @cancel="showEditUserModal = false"
        @saved="handleUserSaved"
      />
    </Dialog>

    <Dialog
      v-model:visible="showCreateComponentModal"
      modal
      header="Create Component"
      size="lg"
    >
      <SystemImplementationComponentCreateForm
        :ssp-id="sspId"
        @cancel="showCreateComponentModal = false"
        @created="handleComponentCreated"
      />
    </Dialog>

    <Dialog
      v-model:visible="showEditComponentModal"
      modal
      header="Edit Component"
      size="lg"
    >
      <SystemImplementationComponentEditForm
        v-if="editingComponent"
        :ssp-id="sspId"
        :component="editingComponent"
        @cancel="showEditComponentModal = false"
        @saved="handleComponentSaved"
      />
    </Dialog>

    <Dialog
      v-model:visible="showCreateLeveragedAuthModal"
      modal
      header="Create Leveraged Authorization"
      size="lg"
    >
      <SystemImplementationLeveragedAuthorizationCreateForm
        :ssp-id="sspId"
        @cancel="showCreateLeveragedAuthModal = false"
        @created="handleLeveragedAuthCreated"
      />
    </Dialog>

    <Dialog
      v-model:visible="showEditLeveragedAuthModal"
      modal
      header="Edit Leveraged Authorization"
      size="lg"
    >
      <SystemImplementationLeveragedAuthorizationEditForm
        v-if="editingLeveragedAuth"
        :ssp-id="sspId"
        :auth="editingLeveragedAuth"
        @cancel="showEditLeveragedAuthModal = false"
        @saved="handleLeveragedAuthSaved"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import decamelizeKeys from 'decamelize-keys';
import Dialog from '@/volt/Dialog.vue';
import SystemImplementationOverviewForm from '@/components/system-security-plans/SystemImplementationOverviewForm.vue';
import SystemImplementationUserCreateForm from '@/components/system-security-plans/SystemImplementationUserCreateForm.vue';
import SystemImplementationUserEditForm from '@/components/system-security-plans/SystemImplementationUserEditForm.vue';
import SystemImplementationComponentCreateForm from '@/components/system-security-plans/SystemImplementationComponentCreateForm.vue';
import SystemImplementationComponentEditForm from '@/components/system-security-plans/SystemImplementationComponentEditForm.vue';
import SystemImplementationLeveragedAuthorizationCreateForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationCreateForm.vue';
import SystemImplementationLeveragedAuthorizationEditForm from '@/components/system-security-plans/SystemImplementationLeveragedAuthorizationEditForm.vue';
import type {
  LeveragedAuthorization,
  SystemComponent,
  SystemImplementation,
  SystemUser,
} from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';

type ImplementationTab = 'overview' | 'users' | 'components' | 'authorizations';
type DistributionTone = 'success' | 'warning' | 'info' | 'muted';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const sspId = computed(() => String(route.params.id || ''));
const innerTab = ref<ImplementationTab>('overview');
const hasActivatedOnce = ref(false);

const systemImplementationUrl = computed(
  () => `/api/oscal/system-security-plans/${sspId.value}/system-implementation`,
);
const usersUrl = computed(
  () =>
    `/api/oscal/system-security-plans/${sspId.value}/system-implementation/users`,
);
const componentsUrl = computed(
  () =>
    `/api/oscal/system-security-plans/${sspId.value}/system-implementation/components`,
);
const leveragedAuthUrl = computed(
  () =>
    `/api/oscal/system-security-plans/${sspId.value}/system-implementation/leveraged-authorizations`,
);

const {
  data: systemImplementation,
  isLoading: systemImplementationLoading,
  error: systemImplementationError,
  execute: loadSystemImplementation,
} = useDataApi<SystemImplementation>(systemImplementationUrl);

const {
  data: users,
  isLoading: usersLoading,
  error: usersError,
  execute: loadUsers,
} = useDataApi<SystemUser[]>(usersUrl);

const {
  data: components,
  isLoading: componentsLoading,
  error: componentsError,
  execute: loadComponents,
} = useDataApi<SystemComponent[]>(componentsUrl);

const {
  data: leveragedAuthorizations,
  isLoading: leveragedAuthorizationsLoading,
  error: leveragedAuthorizationsError,
  execute: loadLeveragedAuthorizations,
} = useDataApi<LeveragedAuthorization[]>(leveragedAuthUrl);

const { execute: executeDeleteUser } = useDataApi<void>(null, {
  method: 'DELETE',
});
const { execute: executeDeleteComponent } = useDataApi<void>(null, {
  method: 'DELETE',
});
const { execute: executeDeleteLeveragedAuth } = useDataApi<void>(null, {
  method: 'DELETE',
});

const showOverviewEditorModal = ref(false);
const showCreateUserModal = ref(false);
const showEditUserModal = ref(false);
const showCreateComponentModal = ref(false);
const showEditComponentModal = ref(false);
const showCreateLeveragedAuthModal = ref(false);
const showEditLeveragedAuthModal = ref(false);

const editingUser = ref<SystemUser | null>(null);
const editingComponent = ref<SystemComponent | null>(null);
const editingLeveragedAuth = ref<LeveragedAuthorization | null>(null);

const usersCount = computed(() => users.value?.length || 0);
const componentsCount = computed(() => components.value?.length || 0);
const leveragedAuthorizationsCount = computed(
  () => leveragedAuthorizations.value?.length || 0,
);

const implementationTabs = computed<
  Array<{ key: ImplementationTab; label: string }>
>(() => [
  { key: 'overview', label: '01 OVERVIEW' },
  { key: 'users', label: `02 USERS (${usersCount.value})` },
  { key: 'components', label: `03 COMPONENTS (${componentsCount.value})` },
  {
    key: 'authorizations',
    label: `04 AUTHORIZATIONS (${leveragedAuthorizationsCount.value})`,
  },
]);

const overviewProperties = computed(
  () => systemImplementation.value?.props || [],
);
const overviewLinks = computed(() => systemImplementation.value?.links || []);

const isOverviewLoading = computed(
  () =>
    systemImplementationLoading.value &&
    systemImplementation.value === undefined,
);
const isUsersLoading = computed(
  () => usersLoading.value && users.value === undefined,
);
const isComponentsLoading = computed(
  () => componentsLoading.value && components.value === undefined,
);
const isAuthorizationsLoading = computed(
  () =>
    leveragedAuthorizationsLoading.value &&
    leveragedAuthorizations.value === undefined,
);

const overviewErrorMessage = computed(() =>
  toErrorMessage(systemImplementationError.value),
);
const usersErrorMessage = computed(() => toErrorMessage(usersError.value));
const componentsErrorMessage = computed(() =>
  toErrorMessage(componentsError.value),
);
const authorizationsErrorMessage = computed(() =>
  toErrorMessage(leveragedAuthorizationsError.value),
);

watch(
  () => route.query.section,
  (section) => {
    innerTab.value = resolveImplementationTab(section);
  },
  { immediate: true },
);

onActivated(() => {
  innerTab.value = resolveImplementationTab(route.query.section);

  if (hasActivatedOnce.value) {
    void reloadAllData();
  }

  hasActivatedOnce.value = true;
});

const componentTypeDistribution = computed<
  Array<{
    type: string;
    label: string;
    count: number;
    percentage: number;
    tone: DistributionTone;
  }>
>(() => {
  if (!components.value || components.value.length === 0) {
    return [];
  }

  const counts = new Map<string, number>();
  components.value.forEach((component) => {
    const type = (component.type || 'unspecified').toLowerCase();
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  const total = components.value.length;

  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([type, count]) => ({
      type,
      label: formatComponentType(type).toUpperCase(),
      count,
      percentage: Math.round((count / total) * 100),
      tone: distributionToneForType(type),
    }));
});

function distributionToneForType(type: string): DistributionTone {
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'software') return 'success';
  if (normalizedType === 'hardware') return 'warning';
  if (normalizedType === 'service') return 'info';
  return 'muted';
}

function toneColor(tone: DistributionTone): string {
  if (tone === 'success') return 'var(--ui-v2-success)';
  if (tone === 'warning') return 'var(--ui-v2-warning)';
  if (tone === 'info') return 'var(--ui-v2-info)';
  return '#9ca0b0';
}

function toErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unable to load data.';
}

async function reloadOverview(): Promise<void> {
  await loadSystemImplementation(systemImplementationUrl.value);
}

function resolveImplementationTab(section: unknown): ImplementationTab {
  if (section === 'users') {
    return 'users';
  }
  if (section === 'components') {
    return 'components';
  }
  if (section === 'authorizations') {
    return 'authorizations';
  }
  return 'overview';
}

async function reloadAllData(): Promise<void> {
  await Promise.allSettled([
    loadSystemImplementation(systemImplementationUrl.value),
    loadUsers(usersUrl.value),
    loadComponents(componentsUrl.value),
    loadLeveragedAuthorizations(leveragedAuthUrl.value),
  ]);
}

function setInnerTab(tab: ImplementationTab): void {
  innerTab.value = tab;

  const nextSection = tab === 'overview' ? undefined : tab;
  const currentSection =
    typeof route.query.section === 'string' ? route.query.section : undefined;

  if (currentSection === nextSection) {
    return;
  }

  void router.replace({
    name: 'system-security-plan-system-implementation',
    params: { id: sspId.value },
    query: {
      ...route.query,
      section: nextSection,
    },
  });
}

function openOverviewEditor(): void {
  showOverviewEditorModal.value = true;
}

function handleOverviewSaved(
  updatedSystemImplementation: SystemImplementation,
): void {
  systemImplementation.value = updatedSystemImplementation;
  showOverviewEditorModal.value = false;
}

function formatUserHeading(user: SystemUser): string {
  return `v ${(user.title || 'UNTITLED USER').toUpperCase()}`;
}

function formatUserRoles(user: SystemUser): string {
  if (!user.roleIds || user.roleIds.length === 0) {
    return 'none';
  }
  return user.roleIds.join(' / ');
}

function formatUserPrivileges(user: SystemUser): string {
  const titles = (user.authorizedPrivileges || [])
    .map((privilege) => privilege.title)
    .filter((title) => Boolean(title));

  if (titles.length === 0) {
    return 'none';
  }
  return titles.join(' / ').toUpperCase();
}

function formatComponentHeading(component: SystemComponent): string {
  return `v ${(component.title || 'UNTITLED COMPONENT').toUpperCase()}`;
}

function componentTypeColor(type: string): string {
  const normalizedType = type.toLowerCase();
  if (normalizedType === 'service') return 'var(--ui-v2-info)';
  if (normalizedType === 'software') return 'var(--ui-v2-warning)';
  if (normalizedType === 'hardware') return 'var(--ui-v2-warning)';
  if (normalizedType === 'policy') return '#9ca0b0';
  return 'var(--ui-v2-secondary-foreground)';
}

function componentStatusColor(status: string | undefined): string {
  if ((status || '').toLowerCase() === 'operational') {
    return 'var(--ui-v2-success)';
  }
  return '#9ca0b0';
}

function formatProtocols(component: SystemComponent): string {
  if (!component.protocols || component.protocols.length === 0) {
    return 'none';
  }

  return component.protocols
    .map((protocol) => {
      const protocolName =
        protocol.title || protocol.name || protocol.uuid || 'protocol';

      const ranges = (protocol.portRanges || [])
        .map((range) => {
          if (
            range.transport &&
            range.start !== undefined &&
            range.end !== undefined
          ) {
            return `${range.transport} ${range.start}-${range.end}`;
          }
          return null;
        })
        .filter((value): value is string => Boolean(value));

      if (ranges.length === 0) {
        return protocolName;
      }

      return `${protocolName} / ${ranges.join(', ')}`;
    })
    .join(' / ');
}

function formatAuthorizationHeading(auth: LeveragedAuthorization): string {
  return `v ${(auth.title || 'UNTITLED AUTHORIZATION').toUpperCase()}`;
}

function formatDateStamp(value?: string): string {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toISOString().slice(0, 10);
}

function shortUuid(value?: string): string {
  if (!value) {
    return 'N/A';
  }
  if (value.length <= 10) {
    return value;
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function formatAuthorizationProps(auth: LeveragedAuthorization): string {
  const properties = (auth.props || [])
    .map((property) => {
      if (!property.name && !property.value) {
        return null;
      }
      if (!property.name) {
        return property.value;
      }
      if (!property.value) {
        return property.name;
      }
      return `${property.name}=${property.value}`;
    })
    .filter((property): property is string => Boolean(property));

  if (properties.length === 0) {
    return 'none';
  }

  return properties.join(' / ');
}

const editUser = (user: SystemUser) => {
  editingUser.value = user;
  showEditUserModal.value = true;
};

const createUser = () => {
  showCreateUserModal.value = true;
};

const handleUserCreated = (newUser: SystemUser) => {
  users.value?.push(newUser);
  showCreateUserModal.value = false;
};

const handleUserSaved = (updatedUser: SystemUser) => {
  if (users.value) {
    const index = users.value.findIndex(
      (user) => user.uuid === updatedUser.uuid,
    );
    if (index !== -1) {
      users.value[index] = updatedUser;
    }
  }
  showEditUserModal.value = false;
  editingUser.value = null;
};

const downloadUserJSON = (user: SystemUser) => {
  const dataStr = JSON.stringify(
    decamelizeKeys(user, { separator: '-', deep: true }),
    null,
    2,
  );
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `user-${user.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteUser = async (user: SystemUser) => {
  try {
    await executeDeleteUser(
      `/api/oscal/system-security-plans/${sspId.value}/system-implementation/users/${user.uuid}`,
    );
    if (users.value) {
      users.value = users.value.filter(
        (candidate) => candidate.uuid !== user.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'User Deleted',
      detail: 'System user deleted successfully.',
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Failed to delete user. Please try again.',
      life: 3500,
    });
  }
};

const editComponent = (component: SystemComponent) => {
  editingComponent.value = component;
  showEditComponentModal.value = true;
};

const createComponent = () => {
  showCreateComponentModal.value = true;
};

const handleComponentCreated = (newComponent: SystemComponent) => {
  components.value?.push(newComponent);
  showCreateComponentModal.value = false;
};

const handleComponentSaved = (updatedComponent: SystemComponent) => {
  if (components.value) {
    const index = components.value.findIndex(
      (component) => component.uuid === updatedComponent.uuid,
    );
    if (index !== -1) {
      components.value[index] = updatedComponent;
    }
  }
  showEditComponentModal.value = false;
  editingComponent.value = null;
};

const downloadComponentJSON = (component: SystemComponent) => {
  const dataStr = JSON.stringify(
    decamelizeKeys(component, { separator: '-', deep: true }),
    null,
    2,
  );
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `component-${component.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteComponent = async (component: SystemComponent) => {
  try {
    await executeDeleteComponent(
      `/api/oscal/system-security-plans/${sspId.value}/system-implementation/components/${component.uuid}`,
    );
    if (components.value) {
      components.value = components.value.filter(
        (candidate) => candidate.uuid !== component.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Component Deleted',
      detail: 'System component deleted successfully.',
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Failed to delete component. Please try again.',
      life: 3500,
    });
  }
};

const editLeveragedAuth = (auth: LeveragedAuthorization) => {
  editingLeveragedAuth.value = auth;
  showEditLeveragedAuthModal.value = true;
};

const createLeveragedAuthorization = () => {
  showCreateLeveragedAuthModal.value = true;
};

const handleLeveragedAuthCreated = (newAuth: LeveragedAuthorization) => {
  leveragedAuthorizations.value?.push(newAuth);
  showCreateLeveragedAuthModal.value = false;
};

const handleLeveragedAuthSaved = (updatedAuth: LeveragedAuthorization) => {
  if (leveragedAuthorizations.value) {
    const index = leveragedAuthorizations.value.findIndex(
      (auth) => auth.uuid === updatedAuth.uuid,
    );
    if (index !== -1) {
      leveragedAuthorizations.value[index] = updatedAuth;
    }
  }
  showEditLeveragedAuthModal.value = false;
  editingLeveragedAuth.value = null;
};

const downloadLeveragedAuthJSON = (auth: LeveragedAuthorization) => {
  const dataStr = JSON.stringify(
    decamelizeKeys(auth, { separator: '-', deep: true }),
    null,
    2,
  );
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leveraged-auth-${auth.uuid}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const deleteLeveragedAuth = async (auth: LeveragedAuthorization) => {
  try {
    await executeDeleteLeveragedAuth(
      `/api/oscal/system-security-plans/${sspId.value}/system-implementation/leveraged-authorizations/${auth.uuid}`,
    );
    if (leveragedAuthorizations.value) {
      leveragedAuthorizations.value = leveragedAuthorizations.value.filter(
        (candidate) => candidate.uuid !== auth.uuid,
      );
    }
    toast.add({
      severity: 'success',
      summary: 'Authorization Deleted',
      detail: 'Leveraged authorization deleted successfully.',
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Failed to delete leveraged authorization. Please try again.',
      life: 3500,
    });
  }
};

const formatComponentType = (type: string): string => {
  const typeMap: Record<string, string> = {
    software: 'Software',
    hardware: 'Hardware',
    service: 'Service',
    policy: 'Policy',
    physical: 'Physical',
    'org-defined': 'Organization Defined',
    process: 'Process',
    procedure: 'Procedure',
    plan: 'Plan',
    guidance: 'Guidance',
    standard: 'Standard',
    validation: 'Validation',
    unspecified: 'Unspecified',
  };

  return (
    typeMap[type.toLowerCase()] ||
    type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
};
</script>
