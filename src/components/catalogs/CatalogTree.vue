<script setup lang="ts">
import Tree from '@/volt/Tree.vue';
import type { Catalog } from '@/oscal'
import { useCatalogTree } from '@/composables/useCatalogTree'

const { catalog } = defineProps<{
  catalog: Catalog
}>()

const { nodes, build } = useCatalogTree()
build(catalog)
</script>

<template>
  <Tree :value="nodes" />
</template>
