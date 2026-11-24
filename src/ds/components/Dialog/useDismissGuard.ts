import { nextTick, ref, watch, type Ref } from 'vue';

/**
 * Shared close and focus behaviour for Dialog and Drawer (F-11 AC2, F-20 AC4).
 * Every way of closing goes through `requestClose`; when the content is dirty it shows the
 * inline discard prompt instead of closing. Escape and overlay clicks are routed here by
 * handling reka's escapeKeyDown and pointerDownOutside events. Focus returns to the opener.
 * A click in something marked `data-overlay-keep-open` (the toasts, which sit outside every
 * dialog) isn't a click outside: closing a toast leaves the dialog open.
 */
const FIELD =
  'input:not([type="hidden"]), select, textarea, [role="combobox"], [role="switch"], [role="checkbox"], [role="radio"]';
const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]';

function firstTabbable(
  root: Element | null,
  selector: string,
): HTMLElement | undefined {
  if (!root) return undefined;
  return [...root.querySelectorAll<HTMLElement>(selector)].find(
    (el) => el.tabIndex >= 0 && !el.matches(':disabled'),
  );
}

/**
 * Initial focus: an element marked data-autofocus, else the first form field in the body,
 * else the title (when visible), else the first focusable element in the body, else the content.
 * Never the close button.
 */
function focusInitial(container: HTMLElement, titleHidden: boolean): void {
  const body = container.querySelector('[data-overlay-body]');
  const title = titleHidden
    ? null
    : container.querySelector<HTMLElement>('[data-overlay-title]');
  const target =
    container.querySelector<HTMLElement>('[data-autofocus]') ??
    firstTabbable(body, FIELD) ??
    title ??
    firstTabbable(body, TABBABLE) ??
    container;
  target.focus();
}

/**
 * The element focus returns to on close. Opened from a menu item, that is the menu's trigger,
 * because the item is gone by the time the dialog closes.
 */
function resolveOpener(active: Element | null): HTMLElement | null {
  const menu = active?.closest('[role="menu"]');
  const trigger = menu?.id
    ? document.querySelector(`[aria-controls="${menu.id}"]`)
    : active;
  return trigger instanceof HTMLElement ? trigger : null;
}

export function useDismissGuard(
  open: Ref<boolean>,
  dirty: () => boolean,
  titleHidden: () => boolean = () => false,
) {
  const confirming = ref(false);
  let container: HTMLElement | null = null;
  let returnFocus: HTMLElement | null = null;
  let opener: HTMLElement | null = null;

  function requestClose(): void {
    if (!dirty()) {
      open.value = false;
      return;
    }
    returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    confirming.value = true;
  }

  function keepEditing(): void {
    confirming.value = false;
    void nextTick(() => {
      if (returnFocus?.isConnected) returnFocus.focus();
      else if (container) focusInitial(container, titleHidden());
    });
  }

  function discard(): void {
    confirming.value = false;
    open.value = false;
  }

  function onEscapeKeyDown(event: KeyboardEvent): void {
    if (confirming.value) {
      event.preventDefault();
      keepEditing();
    } else if (dirty()) {
      event.preventDefault();
      requestClose();
    }
  }

  function onPointerDownOutside(event: Event): void {
    const detail = (event as CustomEvent<{ originalEvent?: Event }>).detail;
    const target = detail?.originalEvent?.target ?? event.target;
    if (
      target instanceof Element &&
      target.closest('[data-overlay-keep-open]')
    ) {
      event.preventDefault();
      return;
    }
    if (!dirty()) return;
    event.preventDefault();
    if (!confirming.value) requestClose();
  }

  function onOpenAutoFocus(event: Event): void {
    event.preventDefault();
    container = event.target as HTMLElement;
    focusInitial(container, titleHidden());
  }

  function onCloseAutoFocus(event: Event): void {
    event.preventDefault();
    if (opener?.isConnected) opener.focus();
  }

  watch(
    open,
    (isOpen) => {
      if (isOpen) opener = resolveOpener(document.activeElement);
      else confirming.value = false;
    },
    { flush: 'sync', immediate: true },
  );

  return {
    confirming,
    requestClose,
    keepEditing,
    discard,
    onEscapeKeyDown,
    onPointerDownOutside,
    onOpenAutoFocus,
    onCloseAutoFocus,
  };
}
