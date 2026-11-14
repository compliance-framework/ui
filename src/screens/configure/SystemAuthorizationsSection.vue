<script setup lang="ts">
/**
 * Configure System → Leveraged Authorizations, as a RecordCollection, with a link to the inherited
 * capabilities that subscribing to export offerings brings (most of these records come from that).
 */
import { useRoute } from 'vue-router';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordCollection from '../RecordCollection.vue';
import { SSP_LEVERAGED_AUTHORIZATIONS } from './sspCollections';

defineProps<{ sspId: string }>();
const route = useRoute();
</script>

<template>
  <Stack gap="4">
    <TextLink
      :to="{
        name: 'system-configure-inherited-capabilities',
        params: route.params,
      }"
      >Inherited capabilities</TextLink
    >
    <RecordCollection
      :kind="SSP_LEVERAGED_AUTHORIZATIONS"
      :url="`/api/oscal/system-security-plans/${sspId}/system-implementation/leveraged-authorizations`"
      :form-props="{ sspId }"
      icon="frameworks"
    />
  </Stack>
</template>
