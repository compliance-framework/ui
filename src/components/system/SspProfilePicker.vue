<template>
  <div class="flex flex-col gap-1">
    <label
      :for="inputId"
      class="text-sm font-medium text-gray-700 dark:text-slate-400"
    >
      Profiles
    </label>
    <MultiSelect
      :input-id="inputId"
      v-model="selectedProfiles"
      :options="profileOptions"
      option-label="name"
      option-value="value"
      display="chip"
      placeholder="Select the profiles this system implements"
      :loading="loadingProfiles"
      :disabled="profileSaveInProgress"
      :filter="profileOptions.length > 8"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import type { Profile } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useSspProfileBindings } from '@/composables/useSspProfileBindings';

// Attaches and detaches profiles on an SSP. Each change is saved straight away (see
// useSspProfileBindings) and reported through `updated` so the host page can reload
// whatever it derives from the profiles.
const props = withDefaults(
  defineProps<{
    sspId: string;
    inputId?: string;
  }>(),
  { inputId: 'ssp-profile-picker' },
);

const emit = defineEmits<{
  updated: [profileIds: string[]];
}>();

const { data: profiles, isLoading: loadingProfiles } = useDataApi<Profile[]>(
  '/api/oscal/profiles',
);

const profileOptions = computed(
  () =>
    profiles.value?.map((profile) => ({
      name: profile.metadata.title,
      value: profile.uuid,
    })) ?? [],
);

const { selectedProfiles, profileSaveInProgress, loadInitialProfiles } =
  useSspProfileBindings(
    () => props.sspId,
    async (profileIds) => {
      emit('updated', profileIds);
    },
  );

onMounted(loadInitialProfiles);
</script>
