<template>
<!--  <PageHeader> Assessment Plan</PageHeader>-->
<!--  <PageSubHeader>-->
<!--    {{ plan.metadata.title }}-->
<!--  </PageSubHeader>-->
<!--  <div class="grid grid-cols-2 gap-4 mt-4">-->
<!--    <div class="bg-white rounded shadow">-->
<!--      <div class="px-4 pt-2">-->
<!--        <h3 class="text-lg font-semibold text-zinc-600">Compliance over time</h3>-->
<!--      </div>-->
<!--      <div class="h-32">-->
<!--        <ResultComplianceOverTimeChart :data="complianceChartData" />-->
<!--      </div>-->
<!--    </div>-->
<!--    <div class="bg-white rounded shadow">-->
<!--      <div class="px-4 pt-2">-->
<!--        <h3 class="text-lg font-semibold text-zinc-600">Agent health</h3>-->
<!--      </div>-->
<!--      <div class="h-32">-->
<!--        <ResultComplianceOverTimeChart :data="uptimeChartData" />-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--  <PageCard class="mt-4">-->
<!--    <div-->
<!--      class="flex items-center border-t first:border-none hover:bg-zinc-100 py-2 px-2"-->
<!--      v-for="result in results"-->
<!--      :key="result.uuid"-->
<!--    >-->
<!--      <div class="w-1/3">{{ result.title }}</div>-->
<!--      <div class="grow-0 pr-12">-->
<!--        <ResultStatusBadge-->
<!--          :gray="result.observations?.length"-->
<!--          :red="result.findings?.filter(finding => finding.target.status.state?.toLowerCase() != 'satisfied').length"-->
<!--          :green="result.findings?.filter(finding => finding.target.status.state?.toLowerCase() == 'satisfied').length"-->
<!--        ></ResultStatusBadge>-->
<!--      </div>-->
<!--      <div class="flex-wrap grow">-->
<!--        <LabelList :labels="viewableLabels(result.labels)" />-->
<!--      </div>-->
<!--      <div>-->
<!--        <RouterLink-->
<!--          class="bg-gray-50 hover:bg-gray-200 text-blue-800 border border-blue-800 px-4 py-1 rounded-md text-sm mr-2"-->
<!--          :to="{ name: 'finding-history', params: { stream: result.streamId } }"-->
<!--        >History-->
<!--        </RouterLink>-->
<!--        <RouterLink-->
<!--          class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm"-->
<!--          :to="{ name: 'finding-view', params: { id: result.uuid } }"-->
<!--        >View-->
<!--        </RouterLink>-->
<!--      </div>-->
<!--      &lt;!&ndash;        <div class="px-2 py-2 flex-1">{{ assessment.title }}</div>&ndash;&gt;-->
<!--      &lt;!&ndash;        <div class="px-2 w-1/5 h-8">&ndash;&gt;-->
<!--      &lt;!&ndash;          <LineChart&ndash;&gt;-->
<!--      &lt;!&ndash;            :options="{&ndash;&gt;-->
<!--      &lt;!&ndash;              plugins: {&ndash;&gt;-->
<!--      &lt;!&ndash;                tooltip: {&ndash;&gt;-->
<!--      &lt;!&ndash;                  enabled: false,&ndash;&gt;-->
<!--      &lt;!&ndash;                },&ndash;&gt;-->
<!--      &lt;!&ndash;              },&ndash;&gt;-->
<!--      &lt;!&ndash;              elements: {&ndash;&gt;-->
<!--      &lt;!&ndash;                point: {&ndash;&gt;-->
<!--      &lt;!&ndash;                  hoverRadius: 0,&ndash;&gt;-->
<!--      &lt;!&ndash;                  hitRadius: 0,&ndash;&gt;-->
<!--      &lt;!&ndash;                },&ndash;&gt;-->
<!--      &lt;!&ndash;              },&ndash;&gt;-->
<!--      &lt;!&ndash;            }"&ndash;&gt;-->
<!--      &lt;!&ndash;            :data="assessment.data"&ndash;&gt;-->
<!--      &lt;!&ndash;          />&ndash;&gt;-->
<!--      &lt;!&ndash;        </div>&ndash;&gt;-->
<!--    </div>-->
<!--  </PageCard>-->
</template>
<script setup lang="ts">
// import PageHeader from '@/components/PageHeader.vue'
// import PageSubHeader from '@/components/PageSubHeader.vue'
// import PageCard from '@/components/PageCard.vue'
// import { onMounted, ref } from 'vue'
// import { useRoute } from 'vue-router'
// import { useApiStore, type Plan, type Result, type DataResponse, type LabelMap } from '@/stores/api.ts'
// import { type ChartData } from 'chart.js'
// import LabelList from '@/components/LabelList.vue'
// import {
//   calculateComplianceOverTimeData, type DateDataPoint
// } from '@/parsers/findings.ts'
// import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
// import ResultStatusBadge from '@/components/ResultStatusBadge.vue'
//
// const route = useRoute()
// const apiStore = useApiStore()
//
// const plan = ref<Plan>({metadata: {}} as Plan)
// const results = ref<Result[]>([])
// const complianceChartData = ref<ChartData<"line", DateDataPoint[]>>({
//   labels: [],
//   datasets: [],
// })
// const uptimeChartData = ref<ChartData<"line", DateDataPoint[]>>({
//   labels: [],
//   datasets: [],
// })
//
// function viewableLabels(labels: LabelMap) {
//   const viewable: LabelMap = {};
//   for (const label in labels) {
//     if (label.substring(0, 1) != "_") {
//       viewable[label] = labels[label];
//     }
//   }
//   return viewable;
// }
//
// onMounted(() => {
//   apiStore.getPlan(route.params.id as string).then((fetchedPlan: DataResponse<Plan>) => {
//     plan.value = fetchedPlan.data
//     apiStore.getComplianceForSearch(fetchedPlan.data.resultFilter).then((response) => {
//       complianceChartData.value = calculateComplianceOverTimeData(response.data);
//     });
//   })
//   apiStore.getPlanResults(route.params.id as string).then((resultsList: DataResponse<Result[]>) => {
//     results.value = resultsList.data
//   })
// })
</script>
