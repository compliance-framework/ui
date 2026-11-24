<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';
import IconButton from '../IconButton/IconButton.vue';
import DiscardPrompt from './DiscardPrompt.vue';
import { useDismissGuard } from './useDismissGuard';
import { useScrollable } from '../ScrollArea/useScrollable';
import type { RouteLocationRaw } from 'vue-router';

/**
 * The one modal implementation behind Dialog and Drawer (F-11, F-18, F-20): named title, focus
 * in, trapped and returned (F-11 AC2), Escape, a body that scrolls inside the panel, a sticky
 * footer, and the dirty guard (F-20 AC4). `placement` is centre (Dialog) or a side (Drawer).
 * A record's title can lead with what the panel shows of it (`titlePrefix`, "Implementation of",
 * not bold) and its ID as a code chip (`titleCode`), and `titleLink` adds an icon link after it
 * that opens the record elsewhere in a new tab. The rule under the header shows only once the body
 * has scrolled, when content passes under it.
 */
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    title: string;
    titlePrefix?: string;
    titleCode?: string;
    /** `label` names the link and should say it opens a new tab. */
    titleLink?: { to: RouteLocationRaw; label: string };
    description?: string;
    placement: 'center' | 'left' | 'right';
    size?: 's' | 'm' | 'l';
    /** A side sheet over nearly all of the page (Drawer `size="wide"`). */
    wide?: boolean;
    titleHidden?: boolean;
    dirty?: boolean;
  }>(),
  {
    titlePrefix: undefined,
    titleCode: undefined,
    titleLink: undefined,
    description: undefined,
    size: 'm',
    wide: false,
    titleHidden: false,
    dirty: false,
  },
);
const open = defineModel<boolean>('open', { default: false });

const guard = useDismissGuard(
  open,
  () => props.dirty,
  () => props.titleHidden,
);
const { confirming, requestClose, keepEditing, discard } = guard;
const { scrollable } = useScrollable('body');
/** The title as one line of text, naming the scrolling body. */
const fullTitle = computed(() =>
  [props.titlePrefix, props.titleCode, props.title].filter(Boolean).join(' '),
);
const scrolled = ref(false);
function onScroll(event: Event): void {
  scrolled.value = (event.target as HTMLElement).scrollTop > 0;
}

defineExpose({ requestClose });
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="modal-overlay"
        :class="{ 'modal-overlay--side': placement !== 'center' }"
      />
      <DialogContent
        v-bind="{
          ...(description ? {} : { 'aria-describedby': undefined }),
          ...$attrs,
        }"
        class="modal"
        :class="
          placement === 'center'
            ? ['modal--center', `modal--${size}`]
            : ['modal--side', `modal--${placement}`, { 'modal--wide': wide }]
        "
        @open-auto-focus="guard.onOpenAutoFocus"
        @escape-key-down="guard.onEscapeKeyDown"
        @pointer-down-outside="guard.onPointerDownOutside"
        @close-auto-focus="guard.onCloseAutoFocus"
      >
        <header
          class="modal__header"
          :class="{
            'modal__header--bare': titleHidden && !description,
            'modal__header--ruled': scrolled || $slots.filters,
          }"
        >
          <div
            class="modal__titles"
            :class="{ 'visually-hidden': titleHidden }"
          >
            <div class="modal__title-row">
              <DialogTitle class="modal__title" tabindex="-1" data-overlay-title
                ><template v-if="titlePrefix"
                  ><span class="modal__title-prefix">{{ titlePrefix }}</span
                  >{{ ' ' }}</template
                ><template v-if="titleCode"
                  ><code class="modal__title-code">{{ titleCode }}</code
                  >{{ ' ' }}</template
                >{{ title }}</DialogTitle
              >
              <IconButton
                v-if="titleLink"
                icon="external"
                size="sm"
                :label="titleLink.label"
                :to="titleLink.to"
                target="_blank"
              />
            </div>
            <DialogDescription v-if="description" class="modal__description">{{
              description
            }}</DialogDescription>
          </div>
          <IconButton icon="close" label="Close" @click="requestClose" />
        </header>
        <div v-if="$slots.filters" class="modal__filters">
          <slot name="filters" />
        </div>
        <div
          ref="body"
          class="modal__body"
          :data-scroll="scrollable ? '' : undefined"
          data-overlay-body
          :role="scrollable ? 'region' : undefined"
          :aria-label="scrollable ? fullTitle : undefined"
          :tabindex="scrollable ? 0 : undefined"
          @scroll.passive="onScroll"
        >
          <slot :request-close="requestClose" />
        </div>
        <footer v-if="$slots.footer || confirming" class="modal__footer">
          <DiscardPrompt
            v-if="confirming"
            class="modal__prompt"
            @keep="keepEditing"
            @discard="discard"
          />
          <slot v-else name="footer" :request-close="requestClose" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--ds-z-overlay);
  background: var(--ds-color-scrim);
}

/* A drawer sits one layer below dialogs, so a dialog opened from a drawer covers it. */
.modal-overlay--side {
  z-index: var(--ds-z-drawer);
}

.modal-overlay[data-state='open'] {
  animation: fade-in var(--ds-duration-base) var(--ds-ease-standard);
}

.modal-overlay[data-state='closed'] {
  animation: fade-out var(--ds-duration-fast) var(--ds-ease-standard);
}

.modal {
  position: fixed;
  z-index: var(--ds-z-overlay);
  display: flex;
  flex-direction: column;
  background: var(--ds-color-surface-overlay);
  border-radius: var(--ds-radius-none);
  box-shadow: var(--ds-shadow-overlay);
}

.modal--center {
  inset: 0;
  width: calc(100% - 2 * var(--ds-space-page-x));
  height: fit-content;
  max-height: calc(100% - 2 * var(--ds-space-page-x));
  margin: auto;
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
}

.modal--s {
  max-width: var(--ds-width-dialog-s);
}

.modal--m {
  max-width: var(--ds-width-dialog-m);
}

.modal--l {
  max-width: var(--ds-width-dialog-l);
}

.modal--center[data-state='open'] {
  animation: rise-in var(--ds-duration-base) var(--ds-ease-standard);
}

.modal--center[data-state='closed'] {
  animation: rise-out var(--ds-duration-fast) var(--ds-ease-standard);
}

.modal--side {
  z-index: var(--ds-z-drawer);
  top: 0;
  bottom: 0;
  max-width: calc(100% - var(--ds-space-page-x));
}

.modal--right {
  right: 0;
  width: var(--ds-width-dialog-s);
  border-left: var(--ds-border-width) solid var(--ds-color-border-strong);
  --slide-from: 100%;
}

/* All but the page's gutter (the side sheet's max-width), so a strip of the page stays in view. */
.modal--wide {
  width: 100%;
}

.modal--left {
  left: 0;
  width: var(--ds-width-nav);
  border-right: var(--ds-border-width) solid var(--ds-color-border-strong);
  --slide-from: -100%;
}

.modal--side[data-state='open'] {
  animation: slide-in var(--ds-duration-slow) var(--ds-ease-standard);
}

.modal--side[data-state='closed'] {
  animation: slide-out var(--ds-duration-base) var(--ds-ease-standard);
}

.modal__header {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding: var(--ds-space-4) var(--ds-space-4) var(--ds-space-4)
    var(--ds-space-5);
  border-bottom: var(--ds-border-width) solid transparent;
  transition: border-color var(--ds-duration-fast) var(--ds-ease-standard);
}

.modal__header--ruled {
  border-bottom-color: var(--ds-color-border-subtle);
}

.modal__header--bare {
  justify-content: flex-end;
  padding: var(--ds-space-3);
  border-bottom: none;
}

.modal__titles {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
  padding-top: var(--ds-space-2);
}

.modal__title-row {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  min-width: 0;
}

.modal__title-prefix {
  font-weight: var(--ds-font-weight-regular);
}

/* The ID as a code chip, as in lists and the evidence table. */
.modal__title-code {
  padding: 0 var(--ds-space-2);
  background: var(--ds-color-status-neutral-bg);
  font-family: var(--ds-font-code);
  font-size: var(--ds-font-size-body);
  font-weight: var(--ds-font-weight-regular);
}

.modal__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-font-size-h2);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
}

.modal__description {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-body);
}

.modal__filters {
  flex: none;
  padding: var(--ds-space-3) var(--ds-space-5);
  border-bottom: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.modal__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--ds-space-5);
  /* Content that responds to the space it has (container queries) sizes to the sheet, not the
     page behind it. */
  container-type: inline-size;
}

.modal__header--bare + .modal__body {
  padding-top: 0;
}

.modal__footer {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3);
  padding: var(--ds-space-4) var(--ds-space-5);
  border-top: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.modal__prompt {
  flex: 1 1 100%;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes fade-out {
  to {
    opacity: 0;
  }
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(var(--ds-space-2));
  }
}

@keyframes rise-out {
  to {
    opacity: 0;
    transform: translateY(var(--ds-space-2));
  }
}

@keyframes slide-in {
  from {
    transform: translateX(var(--slide-from));
  }
}

@keyframes slide-out {
  to {
    transform: translateX(var(--slide-from));
  }
}
</style>
