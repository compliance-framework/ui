<template>
  <InputText type="file" @change="onFileChange" />
</template>

<script lang="ts" setup>
import type { Base64 } from '@/oscal';
import InputText from '@/volt/InputText.vue';

const emit = defineEmits<{
  uploaded: [file: File, base64: Base64];
}>();

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    // Handle the file upload logic here

    readFileAsBase64(file)
      .then((res) => {
        emit('uploaded', file, {
          filename: file.name,
          mediaType: file.type,
          value: res.split(',')[1], // Extract Base64 string
        });
      })
      .catch((err) => {
        console.error('Error reading file:', err);
      });
  } else {
    console.error('No file selected');
  }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
</script>
