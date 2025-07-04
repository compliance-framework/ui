<template>
  <PageHeader>
    New Dashboard
  </PageHeader>
  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">Name</label>
        <FormInput v-model="dashboard.name" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Result Filter</label>
        <FormInput v-model="filter" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Controls</label>
        <MultiSelect
          v-model="selectedControls"
          :options="controls"
          filter
          optionLabel="label"
          optionGroupLabel="label"
          optionGroupChildren="items"
          display="chip"
          placeholder="Select Controls"
          class="w-full"
          :virtualScrollerOptions="{ itemSize: 44 }"
        >
          <template #optiongroup="slotProps">
            <div class="flex items-center gap-2">
              <img :alt="slotProps.option.label" src="https://primefaces.org/cdn/primevue/images/flag/flag_placeholder.png" :class="`flag flag-${slotProps.option.code.toLowerCase()}`" style="width: 18px" />
              <div>{{ slotProps.option.label }}</div>
            </div>
          </template>
        </MultiSelect>
      </div>

      <div class="text-right">
        <PrimaryButton
          type="submit"
        >
          Submit
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { onMounted, ref, toValue } from 'vue'
import { useRouter, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { FilterParser } from '@/parsers/labelfilter.ts'
import { type Dashboard, useDashboardStore } from '@/stores/dashboards.ts'
import FormInput from '@/components/forms/FormInput.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import MultiSelect from '@/volt/MultiSelect.vue';
import { type Control, type Group, useCatalogStore } from '@/stores/catalogs.ts'

const router = useRouter();
const route = useRoute();
const store = useDashboardStore();
const catalogStore = useCatalogStore();
const dashboard = ref<Dashboard>({} as Dashboard);

const filter = ref<string>("");

const selectedControls = ref([]);
const controls = ref<object[]>([]);

onMounted(() => {
  if (route.query['filter']) {
    filter.value = route.query['filter'] as string;
  }

  controls.value = [];
  catalogStore.list().then((data) => {
    data.data.forEach((catalog) => {
      catalogStore.full(catalog.uuid).then((response) => {
        const results = [] as object[];
        response.data.groups.forEach((group) => {
          let controlList = [] as object[];
          if (group.controls) {
            group.controls.forEach((control) => {
              controlList = [...controlList, ...getControlSelectList(control)]
            })

            results.push({
              label: group.title,
              code: group.id,
              items: controlList
            })
          }

        });
        controls.value = [...controls.value, ...results]
      })
    })
  })
})

function getControlSelectList(control: Control): object[] {
  let results = [] as object[];

  if (control.controls) {
    control.controls.forEach((cont) => {
      let subResults = [] as object[];
      if (cont.controls && cont.controls.length > 0) {
        subResults = getControlSelectList(cont);
      }
      results.push({
        label: cont.id + " " + cont.title,
        value: cont.id,
      })
      results = [...results, ...subResults]
    })
  } else {
    results.push({
      label: control.id + " " + control.title,
      value: control.id,
    })
  }

  return results
}

async function submit() {
  const controlIds = [] as string[];
  selectedControls.value.forEach((control) => {
    controlIds.push(control.value);
  });
  try {
    const parsedFilter = new FilterParser(filter.value).parse();
    await store.create({
      ...dashboard.value,
      filter: parsedFilter,
      controls: controlIds,
    })
    return router.push({
      name: 'evidence:index',
      query: { filter: filter.value },
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
