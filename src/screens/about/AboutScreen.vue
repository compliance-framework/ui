<script setup lang="ts">
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/** About (/about): what CCF is. The classic page was a placeholder; nothing links here yet. */
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="About CCF"
      description="The Continuous Compliance Framework."
    />
    <Panel aria-label="About CCF">
      <Stack gap="3">
        <Text
          >CCF tracks whether your systems meet the controls they must. Agents
          and plugins collect evidence continuously; each system's security plan
          says which controls apply, how they're implemented, and what risks
          remain.</Text
        >
        <Text
          >Source code and documentation are on
          <TextLink href="https://github.com/compliance-framework"
            >GitHub</TextLink
          >.</Text
        >
      </Stack>
    </Panel>
  </Stack>
</template>
