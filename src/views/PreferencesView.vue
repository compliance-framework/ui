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

          <div class="space-y-4">
            <div
              class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="flex-1">
                <h3
                  class="text-lg font-medium text-gray-900 dark:text-gray-100"
                >
                  Evidence Digest
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Receive periodic email summaries of evidence updates and
                  activities
                </p>
              </div>

              <div class="ml-4">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="digestSubscribed"
                    @change="updateDigestSubscription"
                    :disabled="updating"
                    class="sr-only peer"
                    aria-label="Toggle email digest subscription"
                  />
                  <div
                    class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <div
              v-if="digestSubscribed"
              class="ml-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
            >
              <p class="text-sm text-blue-800 dark:text-blue-200">
                <strong>Active:</strong> You will receive digest emails
                according to the system schedule.
              </p>
            </div>

            <div v-else class="ml-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                <strong>Inactive:</strong> You will not receive digest emails.
              </p>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { CCFUser } from '@/stores/types';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';

const axios = useAuthenticatedInstance();
const user = ref<CCFUser | null>(null);
const loading = ref(true);
const updating = ref(false);
const digestSubscribed = ref(false);
const updateError = ref<string | null>(null);
const updateSuccess = ref(false);
const loadError = ref<string | null>(null);
const successTimeoutId = ref<number | null>(null);

// Load user data and digest subscription
const loadUserData = async () => {
  try {
    // Get current user info
    const userResponse = await axios.get<{ data: CCFUser }>('/api/users/me');
    user.value = userResponse.data.data;

    // Get digest subscription status
    const subscriptionResponse = await axios.get<{
      data: { subscribed: boolean };
    }>('/api/users/me/digest-subscription');
    digestSubscribed.value = subscriptionResponse.data.data.subscribed;
  } catch (error) {
    console.error('Error loading user data:', error);
    loadError.value =
      'Failed to load preferences. Please refresh the page to try again.';
  } finally {
    loading.value = false;
  }
};

// Update digest subscription
const updateDigestSubscription = async () => {
  updating.value = true;
  updateError.value = null;
  updateSuccess.value = false;

  try {
    await axios.put('/api/users/me/digest-subscription', {
      subscribed: digestSubscribed.value,
    });

    updateSuccess.value = true;
    // Hide success message after 3 seconds
    successTimeoutId.value = window.setTimeout(() => {
      updateSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Error updating digest subscription:', error);
    updateError.value = 'Failed to update preferences. Please try again.';
    // Revert the checkbox state on error
    digestSubscribed.value = !digestSubscribed.value;
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
