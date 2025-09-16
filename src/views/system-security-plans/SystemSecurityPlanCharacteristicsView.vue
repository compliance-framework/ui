<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
    >
      <h2 class="text-2xl font-bold text-gray-900 dark:text-slate-300">
        System Characteristics
      </h2>
      <p class="text-gray-600 dark:text-slate-400 mt-1">
        Overview of system architecture, boundaries, and security
        characteristics
      </p>
    </div>

    <!-- Metrics Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Security Level Metric -->
      <div
        class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <div
              class="text-2xl font-bold text-indigo-600 dark:text-indigo-400"
            >
              {{ characteristics?.securitySensitivityLevel || 'N/A' }}
            </div>
            <div class="text-sm text-indigo-600 dark:text-indigo-400">
              Security Level
            </div>
          </div>
          <svg
            class="w-8 h-8 text-indigo-300 dark:text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            ></path>
          </svg>
        </div>
      </div>

      <!-- Authorization Status Metric -->
      <div
        class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              {{ authorizationStatus }}
            </div>
            <div class="text-sm text-green-600 dark:text-green-400">
              Authorization Status
            </div>
            <div
              v-if="daysSinceAuthorization !== null"
              class="text-xs text-green-500 dark:text-green-300 mt-1"
            >
              {{ daysSinceAuthorization }} days ago
            </div>
          </div>
          <svg
            class="w-8 h-8 text-green-300 dark:text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
      </div>

      <!-- Total Diagrams Metric -->
      <div
        class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {{ totalDiagrams }}
            </div>
            <div class="text-sm text-blue-600 dark:text-blue-400">
              Architecture Diagrams
            </div>
            <div class="text-xs text-blue-500 dark:text-blue-300 mt-1">
              Across {{ diagramCategories }} categories
            </div>
          </div>
          <svg
            class="w-8 h-8 text-blue-300 dark:text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            ></path>
          </svg>
        </div>
      </div>

      <!-- Completeness Metric -->
      <div
        class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <div
              class="text-2xl font-bold text-purple-600 dark:text-purple-400"
            >
              {{ completenessPercentage }}%
            </div>
            <div class="text-sm text-purple-600 dark:text-purple-400">
              Profile Completeness
            </div>
            <div class="text-xs text-purple-500 dark:text-purple-300 mt-1">
              {{ fieldsCompleted }} of {{ totalFields }} fields
            </div>
          </div>
          <svg
            class="w-8 h-8 text-purple-300 dark:text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
    <!-- System Information Card -->
    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
    >
      <div class="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-2xl font-bold text-white mb-2">
              {{ characteristics?.systemName || 'System Information' }}
            </h3>
            <p v-if="characteristics?.systemNameShort" class="text-blue-100">
              {{ characteristics.systemNameShort }}
            </p>
          </div>
          <button
            @click="() => {}"
            class="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md backdrop-blur-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            <svg
              class="w-5 h-5 inline-block mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              ></path>
            </svg>
            Edit
          </button>
        </div>
      </div>

      <div class="p-6">
        <div v-if="characteristics" class="space-y-6">
          <div
            v-if="characteristics.description"
            class="prose prose-sm dark:prose-invert max-w-none"
          >
            <h4
              class="text-sm font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wider mb-2"
            >
              System Description
            </h4>
            <p class="text-gray-900 dark:text-slate-300 leading-relaxed">
              {{ characteristics.description }}
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-if="characteristics.securitySensitivityLevel"
              class="bg-gray-50 dark:bg-slate-800 rounded-lg p-4"
            >
              <label
                class="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-2"
                >Security Sensitivity Level</label
              >
              <p class="text-lg font-medium text-gray-900 dark:text-slate-300">
                {{ characteristics.securitySensitivityLevel }}
              </p>
            </div>

            <div
              v-if="characteristics.dateAuthorized"
              class="bg-gray-50 dark:bg-slate-800 rounded-lg p-4"
            >
              <label
                class="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-2"
                >Date Authorized</label
              >
              <p class="text-lg font-medium text-gray-900 dark:text-slate-300">
                {{ formatDate(characteristics.dateAuthorized?.toString()) }}
              </p>
            </div>
          </div>

          <div
            v-if="characteristics.remarks"
            class="border-t border-gray-200 dark:border-slate-700 pt-4"
          >
            <h4
              class="text-sm font-semibold text-gray-700 dark:text-slate-400 uppercase tracking-wider mb-2"
            >
              Additional Remarks
            </h4>
            <p class="text-gray-700 dark:text-slate-300 italic">
              {{ characteristics.remarks }}
            </p>
          </div>
        </div>

        <div v-else-if="loading" class="text-center py-8">
          <div class="inline-flex items-center">
            <svg
              class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span class="text-gray-600 dark:text-slate-400"
              >Loading system characteristics...</span
            >
          </div>
        </div>

        <div
          v-else-if="error"
          class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4"
        >
          <p class="text-red-600 dark:text-red-400">
            <svg
              class="w-5 h-5 inline-block mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            {{ error }}
          </p>
        </div>

        <div v-else class="text-center py-8">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
          <p class="mt-2 text-gray-500 dark:text-slate-400">
            No system characteristics available
          </p>
        </div>
      </div>
    </div>

    <!-- Architecture Diagrams Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Network Architecture Card -->
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
      >
        <div class="bg-gradient-to-r from-green-500 to-teal-600 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">
              Network Architecture
            </h3>
            <svg
              class="w-6 h-6 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              ></path>
            </svg>
          </div>
        </div>

        <div class="p-4">
          <div v-if="networkArchitecture">
            <div v-if="networkArchitecture.description" class="mb-4">
              <p class="text-sm text-gray-700 dark:text-slate-300">
                {{ networkArchitecture.description }}
              </p>
            </div>

            <div v-if="networkArchitecture.diagrams?.length" class="space-y-2">
              <div
                class="flex items-center text-sm text-gray-600 dark:text-slate-400 mb-2"
              >
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                {{ networkArchitecture.diagrams.length }} Diagram{{
                  networkArchitecture.diagrams.length !== 1 ? 's' : ''
                }}
              </div>
              <div
                v-for="(diagram, index) in networkArchitecture.diagrams"
                :key="diagram.uuid"
                class="border-l-4 border-green-500 pl-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-r transition-colors"
              >
                <div
                  class="font-medium text-sm text-gray-900 dark:text-slate-300"
                >
                  {{ diagram.caption || `Network Diagram ${index + 1}` }}
                </div>
                <div
                  v-if="diagram.description"
                  class="text-xs text-gray-600 dark:text-slate-400 mt-1"
                >
                  {{ diagram.description }}
                </div>
              </div>
            </div>

            <div v-else class="text-sm text-gray-500 dark:text-slate-400">
              No diagrams available
            </div>
          </div>

          <div
            v-else-if="networkArchitectureLoading"
            class="flex items-center justify-center py-4"
          >
            <svg
              class="animate-spin h-5 w-5 text-green-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <div v-else class="text-center py-4">
            <svg
              class="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              ></path>
            </svg>
            <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
              No network architecture defined
            </p>
          </div>
        </div>
      </div>

      <!-- Data Flow Card -->
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
      >
        <div class="bg-gradient-to-r from-blue-500 to-cyan-600 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">Data Flow</h3>
            <svg
              class="w-6 h-6 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              ></path>
            </svg>
          </div>
        </div>

        <div class="p-4">
          <div v-if="dataFlow">
            <div v-if="dataFlow.description" class="mb-4">
              <p class="text-sm text-gray-700 dark:text-slate-300">
                {{ dataFlow.description }}
              </p>
            </div>

            <div v-if="dataFlow.diagrams?.length" class="space-y-2">
              <div
                class="flex items-center text-sm text-gray-600 dark:text-slate-400 mb-2"
              >
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                {{ dataFlow.diagrams.length }} Diagram{{
                  dataFlow.diagrams.length !== 1 ? 's' : ''
                }}
              </div>
              <div
                v-for="(diagram, index) in dataFlow.diagrams"
                :key="diagram.uuid"
                class="border-l-4 border-blue-500 pl-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-r transition-colors"
              >
                <div
                  class="font-medium text-sm text-gray-900 dark:text-slate-300"
                >
                  {{ diagram.caption || `Data Flow Diagram ${index + 1}` }}
                </div>
                <div
                  v-if="diagram.description"
                  class="text-xs text-gray-600 dark:text-slate-400 mt-1"
                >
                  {{ diagram.description }}
                </div>
              </div>
            </div>

            <div v-else class="text-sm text-gray-500 dark:text-slate-400">
              No diagrams available
            </div>
          </div>

          <div
            v-else-if="dataFlowLoading"
            class="flex items-center justify-center py-4"
          >
            <svg
              class="animate-spin h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <div v-else class="text-center py-4">
            <svg
              class="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              ></path>
            </svg>
            <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
              No data flow defined
            </p>
          </div>
        </div>
      </div>

      <!-- Authorization Boundary Card -->
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg overflow-hidden"
      >
        <div class="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">
              Authorization Boundary
            </h3>
            <svg
              class="w-6 h-6 text-white/80"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              ></path>
            </svg>
          </div>
        </div>

        <div class="p-4">
          <div v-if="authorizationBoundary">
            <div v-if="authorizationBoundary.description" class="mb-4">
              <p class="text-sm text-gray-700 dark:text-slate-300">
                {{ authorizationBoundary.description }}
              </p>
            </div>

            <div
              v-if="authorizationBoundary.diagrams?.length"
              class="space-y-2"
            >
              <div
                class="flex items-center text-sm text-gray-600 dark:text-slate-400 mb-2"
              >
                <svg
                  class="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
                {{ authorizationBoundary.diagrams.length }} Diagram{{
                  authorizationBoundary.diagrams.length !== 1 ? 's' : ''
                }}
              </div>
              <div
                v-for="(diagram, index) in authorizationBoundary.diagrams"
                :key="diagram.uuid"
                class="border-l-4 border-purple-500 pl-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-r transition-colors"
              >
                <div
                  class="font-medium text-sm text-gray-900 dark:text-slate-300"
                >
                  {{ diagram.caption || `Boundary Diagram ${index + 1}` }}
                </div>
                <div
                  v-if="diagram.description"
                  class="text-xs text-gray-600 dark:text-slate-400 mt-1"
                >
                  {{ diagram.description }}
                </div>
              </div>
            </div>

            <div v-else class="text-sm text-gray-500 dark:text-slate-400">
              No diagrams available
            </div>
          </div>

          <div
            v-else-if="authorizationBoundaryLoading"
            class="flex items-center justify-center py-4"
          >
            <svg
              class="animate-spin h-5 w-5 text-purple-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <div v-else class="text-center py-4">
            <svg
              class="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              ></path>
            </svg>
            <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
              No boundary defined
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { SystemCharacteristics, DiagramGrouping } from '@/oscal';
import { useDataApi } from '@/composables/axios';

const route = useRoute();

const {
  data: characteristics,
  isLoading: loading,
  error,
} = useDataApi<SystemCharacteristics>(
  `/api/oscal/system-security-plans/${route.params.id}/system-characteristics`,
);
const { data: networkArchitecture, isLoading: networkArchitectureLoading } =
  useDataApi<DiagramGrouping | null>(
    `/api/oscal/system-security-plans/${route.params.id}/system-characteristics/network-architecture`,
  );
const { data: authorizationBoundary, isLoading: authorizationBoundaryLoading } =
  useDataApi<DiagramGrouping | null>(
    `/api/oscal/system-security-plans/${route.params.id}/system-characteristics/authorization-boundary`,
  );
const { data: dataFlow, isLoading: dataFlowLoading } =
  useDataApi<DiagramGrouping | null>(
    `/api/oscal/system-security-plans/${route.params.id}/system-characteristics/data-flow`,
  );

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

// Computed properties for metrics
const authorizationStatus = computed(() => {
  if (!characteristics.value?.dateAuthorized) return 'Not Authorized';
  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  const diffTime = now.getTime() - authDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Consider re-authorization needed after 365 days
  if (diffDays > 365) return 'Needs Review';
  return 'Authorized';
});

const daysSinceAuthorization = computed(() => {
  if (!characteristics.value?.dateAuthorized) return null;
  const authDate = new Date(characteristics.value.dateAuthorized.toString());
  const now = new Date();
  const diffTime = now.getTime() - authDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

const totalDiagrams = computed(() => {
  let count = 0;
  if (networkArchitecture.value?.diagrams?.length)
    count += networkArchitecture.value.diagrams.length;
  if (dataFlow.value?.diagrams?.length) count += dataFlow.value.diagrams.length;
  if (authorizationBoundary.value?.diagrams?.length)
    count += authorizationBoundary.value.diagrams.length;
  return count;
});

const diagramCategories = computed(() => {
  let categories = 0;
  if (networkArchitecture.value?.diagrams?.length) categories++;
  if (dataFlow.value?.diagrams?.length) categories++;
  if (authorizationBoundary.value?.diagrams?.length) categories++;
  return categories;
});

const fieldsCompleted = computed(() => {
  let completed = 0;
  if (characteristics.value?.systemName) completed++;
  if (characteristics.value?.systemNameShort) completed++;
  if (characteristics.value?.securitySensitivityLevel) completed++;
  if (characteristics.value?.dateAuthorized) completed++;
  if (characteristics.value?.description) completed++;
  if (characteristics.value?.remarks) completed++;
  if (networkArchitecture.value) completed++;
  if (dataFlow.value) completed++;
  if (authorizationBoundary.value) completed++;
  return completed;
});

const totalFields = 9; // Total possible fields to complete

const completenessPercentage = computed(() => {
  return Math.round((fieldsCompleted.value / totalFields) * 100);
});
</script>
