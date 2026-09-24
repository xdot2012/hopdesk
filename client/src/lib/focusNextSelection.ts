/**
 * Moves keyboard focus and scrolls the viewport to the next selection
 * after conditional content mounts (e.g. série after etapa, temática after matéria).
 */
export function focusNextSelection(element: HTMLElement | null) {
  if (!element) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.focus({ preventScroll: true });
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
