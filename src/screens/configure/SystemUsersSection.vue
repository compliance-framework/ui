<script setup lang="ts">
/** Configure System → Users: the SSP's system users, as a RecordCollection. */
import RecordCollection from '../RecordCollection.vue';
import { SSP_USERS } from './sspCollections';

defineProps<{ sspId: string }>();
</script>

<template>
  <RecordCollection
    :kind="SSP_USERS"
    :url="`/api/oscal/system-security-plans/${sspId}/system-implementation/users`"
    :form-props="{ sspId }"
    icon="people"
  />
</template>
