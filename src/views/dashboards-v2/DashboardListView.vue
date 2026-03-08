<script setup lang="ts">
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import DashboardCompliancePostureSectionV2 from '@/components/v2/dashboard/DashboardCompliancePostureSectionV2.vue';
import DashboardSavedViewsSectionV2 from '@/components/v2/dashboard/DashboardSavedViewsSectionV2.vue';
</script>

<template>
  <div class="space-y-6">
    <V2PageHeader
      eyebrow="Dashboards"
      title="Dashboards"
      description="Compliance posture and findings grouped by query"
    />

    <DashboardCompliancePostureSectionV2 />
    <DashboardSavedViewsSectionV2 />
  </div>
</template>
