<template>
  <div class="flex items-center mt-4 gap-x-4">
    <h1 class="text-4xl font-medium">
      <slot name="default"></slot>
    </h1>
    <slot name="menu" />
  </div>
</template>
