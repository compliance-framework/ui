<template>
  <div class="flex items-center gap-x-4">
    <h1 class="text-2xl">
      <slot name="default"></slot>
    </h1>
    <slot name="menu" />
  </div>
</template>
