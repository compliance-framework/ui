<template>
  <template v-if="loading">
    <PageHeader>Loading preferences...</PageHeader>
  </template>
  <template v-else-if="loadError">
    <PageHeader>Error Loading Preferences</PageHeader>

    <div class="max-w-2xl mx-auto">
      <PageCard class="mb-6">
        <div class="p-6">
          <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p class="text-sm text-red-800 dark:text-red-200">
              {{ loadError }}
            </p>
            <button
              @click="loadUserData"
              class="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      </PageCard>
    </div>
  </template>
  <template v-else>
    <PageHeader>User Preferences</PageHeader>

    <div class="max-w-2xl mx-auto">
      <PageCard class="mb-6">
        <div class="p-6">
          <h2
            class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
          >
            Email Notifications
          </h2>

          <div class="space-y-6">
            <div class="space-y-3">
              <h3
                class="text-base font-semibold text-gray-900 dark:text-gray-100"
              >
                Evidence Notifications
              </h3>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex-1">
                  <h4
                    id="evidence-digest-heading"
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                  >
                    <TooltipTitle
                      text="Evidence Digest"
                      :tooltip-text="evidenceDigestTooltipText"
                    />
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receive periodic email summaries of evidence updates and
                    activities
                  </p>
                </div>

                <div class="ml-4">
                  <label
                    class="relative inline-flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      v-model="digestSubscribed"
                      @change="updateEmailPreferences"
                      :disabled="updating"
                      class="sr-only peer"
                      aria-labelledby="evidence-digest-heading"
                    />
                    <div
                      class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <div
              class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700"
            >
              <h3
                class="text-base font-semibold text-gray-900 dark:text-gray-100"
              >
                Task Notifications
              </h3>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex-1">
                  <h4
                    id="task-available-heading"
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                  >
                    <TooltipTitle
                      text="Task Available Alerts"
                      :tooltip-text="taskAvailableTooltipText"
                    />
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receive an email when new tasks become available for you
                  </p>
                </div>

                <div class="ml-4">
                  <label
                    class="relative inline-flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      v-model="taskAvailableEmailSubscribed"
                      @change="updateEmailPreferences"
                      :disabled="updating"
                      class="sr-only peer"
                      aria-labelledby="task-available-heading"
                    />
                    <div
                      class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex-1">
                  <h4
                    id="task-digest-heading"
                    class="text-lg font-medium text-gray-900 dark:text-gray-100"
                  >
                    <TooltipTitle
                      text="Daily Task Digest"
                      :tooltip-text="taskDailyDigestTooltipText"
                    />
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Receive a daily summary email of your task activity
                  </p>
                </div>

                <div class="ml-4">
                  <label
                    class="relative inline-flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      v-model="taskDailyDigestSubscribed"
                      @change="updateEmailPreferences"
                      :disabled="updating"
                      class="sr-only peer"
                      aria-labelledby="task-digest-heading"
                    />
                    <div
                      class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="updateError"
            class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
          >
            <p class="text-sm text-red-800 dark:text-red-200">
              {{ updateError }}
            </p>
          </div>

          <div
            v-if="updateSuccess"
            class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg"
          >
            <p class="text-sm text-green-800 dark:text-green-200">
              Preferences updated successfully!
            </p>
          </div>
        </div>
      </PageCard>

      <PageCard>
        <div class="p-6">
          <h2
            class="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
          >
            Account Information
          </h2>

          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Email:</span>
              <span class="text-gray-900 dark:text-gray-100">{{
                user?.email
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Name:</span>
              <span class="text-gray-900 dark:text-gray-100"
                >{{ user?.firstName }} {{ user?.lastName }}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400"
                >Authentication Method:</span
              >
              <span class="text-gray-900 dark:text-gray-100">{{
                user?.authMethod || 'Password'
              }}</span>
            </div>
          </div>
        </div>
      </PageCard>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFUser } from '@/stores/types';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';

interface DigestSubscriptionPreferences {
  subscribed: boolean;
  taskAvailableEmailSubscribed: boolean;
  taskDailyDigestSubscribed: boolean;
}

const axios = useAuthenticatedInstance();
const user = ref<CCFUser | null>(null);
const loading = ref(true);
const updating = ref(false);
const digestSubscribed = ref(false);
const taskAvailableEmailSubscribed = ref(false);
const taskDailyDigestSubscribed = ref(false);
const lastSavedPreferences = ref<DigestSubscriptionPreferences>({
  subscribed: false,
  taskAvailableEmailSubscribed: false,
  taskDailyDigestSubscribed: false,
});
const updateError = ref<string | null>(null);
const updateSuccess = ref(false);
const loadError = ref<string | null>(null);
const successTimeoutId = ref<number | null>(null);

const evidenceDigestTooltipText = computed(() =>
  digestSubscribed.value
    ? 'Active: You will receive digest emails according to the system schedule.'
    : 'Inactive: You will not receive digest emails.',
);

const taskAvailableTooltipText = computed(() =>
  taskAvailableEmailSubscribed.value
    ? 'Active: You will receive an email when new tasks become available for you.'
    : 'Inactive: You will not receive task-available alert emails.',
);

const taskDailyDigestTooltipText = computed(() =>
  taskDailyDigestSubscribed.value
    ? 'Active: You will receive a daily summary email of your task activity.'
    : 'Inactive: You will not receive daily task digest emails.',
);

// Load user data and digest subscription
const loadUserData = async () => {
  try {
    // Get current user info
    const userResponse = await axios.get<{ data: CCFUser }>('/api/users/me');
    user.value = userResponse.data.data;

    // Get digest subscription status
    const subscriptionResponse = await axios.get<{
      data: DigestSubscriptionPreferences;
    }>('/api/users/me/digest-subscription');

    digestSubscribed.value = subscriptionResponse.data.data.subscribed;
    taskAvailableEmailSubscribed.value =
      subscriptionResponse.data.data.taskAvailableEmailSubscribed;
    taskDailyDigestSubscribed.value =
      subscriptionResponse.data.data.taskDailyDigestSubscribed;

    lastSavedPreferences.value = {
      subscribed: subscriptionResponse.data.data.subscribed,
      taskAvailableEmailSubscribed:
        subscriptionResponse.data.data.taskAvailableEmailSubscribed,
      taskDailyDigestSubscribed:
        subscriptionResponse.data.data.taskDailyDigestSubscribed,
    };
  } catch (error) {
    console.error('Error loading user data:', error);
    loadError.value =
      'Failed to load preferences. Please refresh the page to try again.';
  } finally {
    loading.value = false;
  }
};

// Update email preferences
const updateEmailPreferences = async () => {
  updating.value = true;
  updateError.value = null;
  updateSuccess.value = false;

  try {
    await axios.put('/api/users/me/digest-subscription', {
      subscribed: digestSubscribed.value,
      taskAvailableEmailSubscribed: taskAvailableEmailSubscribed.value,
      taskDailyDigestSubscribed: taskDailyDigestSubscribed.value,
    });

    lastSavedPreferences.value = {
      subscribed: digestSubscribed.value,
      taskAvailableEmailSubscribed: taskAvailableEmailSubscribed.value,
      taskDailyDigestSubscribed: taskDailyDigestSubscribed.value,
    };

    if (successTimeoutId.value) {
      clearTimeout(successTimeoutId.value);
    }

    updateSuccess.value = true;
    // Hide success message after 3 seconds
    successTimeoutId.value = window.setTimeout(() => {
      updateSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Error updating email preferences:', error);
    updateError.value = 'Failed to update preferences. Please try again.';

    // Revert to previous values on error
    digestSubscribed.value = lastSavedPreferences.value.subscribed;
    taskAvailableEmailSubscribed.value =
      lastSavedPreferences.value.taskAvailableEmailSubscribed;
    taskDailyDigestSubscribed.value =
      lastSavedPreferences.value.taskDailyDigestSubscribed;
  } finally {
    updating.value = false;
  }
};

onMounted(() => {
  loadUserData();
});

onUnmounted(() => {
  if (successTimeoutId.value) {
    clearTimeout(successTimeoutId.value);
  }
});
</script>
