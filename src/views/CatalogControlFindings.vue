<template>
  <PageHeader>Control Findings</PageHeader>
  <PageSubHeader>{{ _class }}: {{ id }}</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <FindingsList :findings="findings" />
  </div>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useRoute } from 'vue-router'
import PageSubHeader from '@/components/PageSubHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { type Finding, useFindingsStore } from '@/stores/findings.ts'
import FindingsList from '@/views/FindingsList.vue'

const findingStore = useFindingsStore()
const findings = ref<Finding[]>([]);

const route = useRoute();
const id = route.params.id as string;
const _class = route.params.class as string;

onMounted(() => {
  findingStore.searchForControlID(_class, id).then((data) => {
    findings.value = data.data
  })
})
</script>
