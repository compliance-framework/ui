<template>
  <teleport to="body">
    <div
      class="relative z-10"
      :aria-labelledby="title"
      role="dialog"
      aria-modal="true"
      v-if="show"
    >
      <div
        class="fixed inset-0 h-screen w-screen overflow-auto z-1"
        aria-hidden="true"
      >
        <div class="bg-gray-500/70 fixed left-0 top-0 w-screen h-screen z-10" @click.prevent="$emit('close')" />
        <div
          :class="'relative z-20 mx-auto my-12 bg-white rounded-md shadow-xl overflow-hidden ' + sizeClass"
          v-bind="$attrs"
        >
            <slot></slot>
        </div>
      </div>

    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  inheritAttrs: false
})
const props = defineProps({
  title: String,
  show: Boolean,
  size: String,
});
defineEmits(['close'])

const getSizeClass = () => {
  const size = props.size as string
  const sizes: {[size: string]: string} = {
    'sm': 'w-1/4',
    'md': 'w-1/3',
    'lg': 'w-1/2',
  }
  if (size) {
    if (sizes.hasOwnProperty(size)) {
      return sizes[size];
    }
  }
  return sizes['md'];
};

const sizeClass = ref(getSizeClass());
</script>
