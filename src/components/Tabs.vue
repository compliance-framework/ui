<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{
  items: Array<{ id: string; label: string }>;
}>();

const active = ref(props.items[0].id);

onMounted(() => {
  active.value = props.items[0].id;
});
</script>

<template>
  <div>
    <button
      v-for="item in props.items"
      :key="item.id"
      type="button"
      @click="active = item.id"
      :class="{
        'px-4 py-2 text-lg border-r last:border-r-0 dark:border-slate-700 dark:hover:bg-slate-900': true,
        'dark:bg-slate-900': active === item.id,
        'dark:bg-slate-800 border-b': active !== item.id,
      }"
    >
      {{ item.label }}
    </button>
  </div>

  <div>
    <template v-for="item in props.items" :key="item.id">
      <slot :name="item.id" v-if="item.id == active"></slot>
    </template>
  </div>
</template>
