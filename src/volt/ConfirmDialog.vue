<template>
    <ConfirmDialog
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge
        }"
    >
        <template #container="{ message, acceptCallback, rejectCallback }">
            <div class="flex items-center justify-between shrink-0 p-5">
                <span class="font-semibold text-xl">{{ message.header }}</span>
                <SecondaryButton variant="text" rounded @click="rejectCallback" autofocus>
                    <template #icon>
                        <TimesIcon />
                    </template>
                </SecondaryButton>
            </div>
            <div class="overflow-y-auto pt-0 px-5 pb-5 flex items-center gap-4">
                <ExclamationTriangleIcon class="size-6" />
                {{ message.message }}
            </div>
            <div class="pt-0 px-5 pb-5 flex justify-end gap-2">
                <SecondaryButton @click="rejectCallback" :label="message.rejectProps.label" size="small" />
                <Button
                  @click="acceptCallback"
                  :class="message.acceptProps.severity"
                  :label="message.acceptProps.label" size="small" />
            </div>
        </template>
    </ConfirmDialog>
</template>

<script setup lang="ts">
import ExclamationTriangleIcon from '@primevue/icons/exclamationtriangle';
import TimesIcon from '@primevue/icons/times';
import ConfirmDialog, { type ConfirmDialogPassThroughOptions, type ConfirmDialogProps } from 'primevue/confirmdialog';
import { ref } from 'vue';
import Button from './Button.vue';
import SecondaryButton from './SecondaryButton.vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ ConfirmDialogProps {}
defineProps<Props>();

const theme = ref<ConfirmDialogPassThroughOptions>({
    root: `max-h-[90%] max-w-screen rounded-xl
        border border-surface-200 dark:border-slate-800
        bg-white dark:bg-slate-600
        text-surface-700 dark:text-gray-200 shadow-lg`,
    mask: `bg-black/50 fixed top-0 start-0 w-full h-full`,
    transition: {
        enterFromClass: 'opacity-0 scale-75',
        enterActiveClass: 'transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)]',
        leaveActiveClass: 'transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
        leaveToClass: 'opacity-0 scale-75'
    },
});
</script>

<style scoped>
@reference "@/assets/main.css";

.danger {
  @apply !bg-red-600/70 !border-red-500/50 hover:!bg-red-600/100 hover:!border-red-600/100 text-white dark:!bg-red-500/70 dark:!border-red-700/70 dark:hover:!bg-red-500 dark:hover:!border-red-600/70;
}

.success {
 @apply !bg-green-600/70 !border-green-500/50 hover:!bg-green-600/100 hover:!border-green-600/100 text-white dark:!bg-green-700/70 dark:!border-green-700/70 dark:hover:!bg-green-600/70 dark:hover:!border-green-600/70;
}
</style>
