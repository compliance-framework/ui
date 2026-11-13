<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { Profile } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import { useSspProfileBindings } from '@/composables/useSspProfileBindings';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import FormField from '@/ds/components/FormField/FormField.vue';

/**
 * The profiles a system implements, which decide the controls on Implementation and Compliance.
 * Ticking or unticking a profile saves straight away (useSspProfileBindings, as the classic
 * picker did) and reports `updated` so the page reloads its controls.
 */
const props = defineProps<{ sspId: string }>();
const emit = defineEmits<{ updated: [profileIds: string[]] }>();

const { data: profiles } = useDataApi<Profile[]>('/api/oscal/profiles');
const { selectedProfiles, loadInitialProfiles } = useSspProfileBindings(
  () => props.sspId,
  async (ids) => emit('updated', ids),
);
onMounted(loadInitialProfiles);

const filter = ref('');
const options = computed(() =>
  (profiles.value ?? [])
    .map((p) => ({ value: p.uuid, label: p.metadata.title }))
    .filter(
      (o) =>
        !filter.value ||
        o.label.toLowerCase().includes(filter.value.toLowerCase()),
    ),
);
const attached = computed(() =>
  (profiles.value ?? [])
    .filter((p) => selectedProfiles.value.includes(p.uuid))
    .map((p) => p.metadata.title),
);
const open = ref(false);
</script>

<template>
  <Stack gap="2">
    <Text v-if="attached.length" variant="body"
      >Attached: {{ attached.join(', ') }}</Text
    >
    <Text v-else variant="secondary">No profiles attached yet.</Text>
    <Disclosure v-model:open="open" label="Change profiles">
      <Stack gap="2">
        <FormField v-if="(profiles?.length ?? 0) > 8" label="Find a profile">
          <TextInput v-model="filter" type="search" />
        </FormField>
        <CheckboxGroup
          v-model="selectedProfiles"
          legend="Profiles this system implements"
          hint="Changes save straight away."
          :options="options"
        />
      </Stack>
    </Disclosure>
  </Stack>
</template>
