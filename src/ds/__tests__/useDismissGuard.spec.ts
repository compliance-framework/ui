import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useDismissGuard } from '../components/Dialog/useDismissGuard';

function outsideClick(target: Element) {
  const event = new CustomEvent('dismissableLayer.pointerDownOutside', {
    cancelable: true,
    detail: { originalEvent: { target } },
  });
  return event;
}

describe('useDismissGuard', () => {
  it('keeps the dialog open when a toast is clicked', () => {
    const open = ref(true);
    const guard = useDismissGuard(open, () => false);
    const region = document.createElement('section');
    region.setAttribute('data-overlay-keep-open', '');
    const close = document.createElement('button');
    region.append(close);

    const onToast = outsideClick(close);
    guard.onPointerDownOutside(onToast);
    expect(onToast.defaultPrevented).toBe(true);

    const elsewhere = outsideClick(document.createElement('div'));
    guard.onPointerDownOutside(elsewhere);
    expect(elsewhere.defaultPrevented).toBe(false);
    expect(open.value).toBe(true);
  });
});
