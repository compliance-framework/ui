<template>
  <div class="px-8 py-8 mt-16 w-1/3 mx-auto bg-white rounded shadow">
    <h3 class="text-xl mb-4">
      New Assessment Plan
    </h3>
    <form @submit.prevent="createPlan">
      <div class="mb-4">
        <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          v-model="name"
          id="name"
          name="name"
          required
          class="mt-1 w-full rounded-md border-black border px-4 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        class="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const name = ref('');

async function createPlan() {
  try {
    const response = await fetch('http://localhost:8080/api/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: name.value,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    return router.push({
      name: 'assessment-plan.view',
      params: { id: data.id },
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
