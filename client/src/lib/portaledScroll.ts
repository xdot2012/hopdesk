import type { WheelEvent } from 'react';

/**
 * Radix Dialog sets `pointer-events: none` on `body` and RemoveScroll blocks
 * native wheel outside the dialog shard. Portaled menus/popovers need
 * `pointer-events-auto` plus this handler so overflow lists still scroll.
 */
export function scrollPortaledOnWheel(event: WheelEvent<HTMLElement>) {
  const el = event.currentTarget;
  if (el.scrollHeight <= el.clientHeight) return;
  el.scrollTop += event.deltaY;
}
