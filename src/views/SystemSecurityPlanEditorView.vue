<template>
  <PageHeader>System Security Plan</PageHeader>
  <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

  <p class="mt-4">
    {{ systemSecurityPlan.metadata?.remarks }}
  </p>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <Tabs
      :items="[
        { id: 'characteristics', label: 'Characteristics' },
        { id: 'implementation', label: 'Implementation' },
        { id: 'control-implementation', label: 'Control Implementation' },
      ]"
      v-if="systemSecurityPlan.uuid"
    >
      <template v-slot:characteristics>
        <div class="px-4 py-2">
          <SystemCharacteristicsForm :system-security-plan-id="systemSecurityPlan.uuid" />

          <h4 class="font-medium">Authorization Boundary</h4>
          <h4 class="font-medium">Network Architecture</h4>
          <h4 class="font-medium">Data Flow</h4>
        </div>
      </template>

      <template v-slot:implementation>System Implementation</template>

      <template v-slot:control-implementation>Control Implementation</template>
    </Tabs>
    <!--    <DiagramEditor />-->
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import {
  type SystemSecurityPlan,
  useSystemSecurityPlanStore,
} from '@/stores/system-security-plans.ts';
import { useRoute } from 'vue-router';
import PageSubHeader from '@/components/PageSubHeader.vue';
import DiagramEditor from '@/components/DiagramEditor.vue';
import Tabs from '@/components/Tabs.vue';
import PrimaryButton from '@/components/PrimaryButton.vue'
import FormInput from '@/components/forms/FormInput.vue'
import SystemCharacteristicsForm from '@/components/SystemCharacteristicsForm.vue'

const route = useRoute();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan);

onMounted(() => {
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
  });
});

async function updateCharacteristics () {

}
</script>
