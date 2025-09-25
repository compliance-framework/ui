<template>
  <PageHeader>Create Profile</PageHeader>
  <PageCard class="mt-8 w-3/4">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">ID</label>
        <div class="flex items-center place-items-stretch">
          <FormInput v-model="profile.uuid" class="rounded-r-none border-r-0" />
          <TertiaryButton
            type="button"
            @click="profile.uuid = uuidv4()"
            class="py-3 rounded-l-none"
            ><BIconArrowRepeat
          /></TertiaryButton>
        </div>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Title</label>
        <FormInput v-model="profile.metadata.title" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Remarks</label>
        <FormTextarea v-model="profile.metadata.remarks" />
      </div>
      <div class="text-right">
        <PrimaryButton type="submit"> Create Profile </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useRouter } from 'vue-router';
import type { Profile, Merge, Import, Modify } from '@/oscal';
import type { BackMatter, Metadata } from '@/oscal';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from 'primevue/usetoast';

import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/components/TertiaryButton.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import { BIconArrowRepeat } from 'bootstrap-icons-vue';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

const router = useRouter();
const toast = useToast();
const profile = ref<Profile>({
  uuid: uuidv4(),
  metadata: {} as Metadata,
  merge: {
    asIs: true,
  } as Merge,
  imports: [] as Import[],
  modify: {
    setParameters: [],
    alters: [],
  } as Modify,
  backMatter: { resources: [] } as BackMatter,
} as Profile);
const { execute: createProfile } = useDataApi<Profile>(
  '/api/oscal/profiles',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

async function submit() {
  try {
    const response = await createProfile({
      data: profile.value,
    });
    toast.add({
      severity: 'success',
      summary: 'Profile Created',
      detail: 'The profile has been created successfully.',
      life: 3000,
    });
    router.push({
      name: 'profile:view-controls',
      params: { id: response.data.value?.data.uuid },
    });
  } catch (error) {
    const { response } = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        response?.data?.errors?.body ||
        'An error occurred while creating the profile.',
      life: 3000,
    });
  }
}
</script>
