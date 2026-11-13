<script setup lang="ts">
import ProfileBuildPropsView from '@/views/profile/ProfileBuildPropsView.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * Build a profile from props (/profiles/build-props): select a catalog's controls by prop rules.
 * The form is the classic view (a legacy island) until rebuilt.
 */
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[{ label: 'Profiles', to: { name: 'profile-list' } }]"
    />
    <PageHeader
      title="Build a profile from props"
      description="Select controls from a catalog by rules on their props."
    />
    <LegacyPage>
      <ProfileBuildPropsView embedded />
    </LegacyPage>
  </Stack>
</template>
