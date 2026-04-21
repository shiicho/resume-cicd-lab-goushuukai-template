import { useEffect, useRef, type RefObject } from 'react';

export type GestureDirection = 'up' | 'down' | 'left' | 'right';

export type GestureHandlers = {
  onSwipe?: (direction: GestureDirection) => void;
  onLongPress?: () => void;
  onLongPressStart?: () => void;
};

const LONG_PRESS_MS = 500;
const MAX_THRESHOLD_PX = 80;
const THRESHOLD_PCT = 0.3;
const MOVE_CANCEL_PX = 12;

/**
 * Pointer-based swipe + long-press recognizer. Threshold per
 * design spec (§2D): min(80px, 30% of element width). Works on
 * touch, stylus, and mouse via PointerEvents.
 *
 * Long-press cancels if the pointer drifts > MOVE_CANCEL_PX or
 * lifts before LONG_PRESS_MS. onLongPressStart fires on initial
 * press — callers can use it for haptic hold feedback.
 *
 * Swipes are recognized only on pointerup when the delta clears
 * the axis-max threshold. Below threshold = tap = no handler call
 * (the underlying <button> still fires its click).
 */
export function useCardGestures(
  ref: RefObject<HTMLElement | null>,
  handlers: GestureHandlers,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let longPressTimer: number | null = null;
    let longPressFired = false;
    let pointerDown = false;

    const clearLongPress = () => {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerDown = true;
      longPressFired = false;
      startX = event.clientX;
      startY = event.clientY;

      handlersRef.current.onLongPressStart?.();
      longPressTimer = window.setTimeout(() => {
        if (pointerDown) {
          longPressFired = true;
          handlersRef.current.onLongPress?.();
        }
      }, LONG_PRESS_MS);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown) return;
      const dx = Math.abs(event.clientX - startX);
      const dy = Math.abs(event.clientY - startY);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        clearLongPress();
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerDown) return;
      pointerDown = false;
      clearLongPress();
      if (longPressFired) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      const width = el.offsetWidth || 300;
      const threshold = Math.min(MAX_THRESHOLD_PX, width * THRESHOLD_PCT);

      if (absX < threshold && absY < threshold) return;

      if (absX > absY) {
        handlersRef.current.onSwipe?.(dx > 0 ? 'right' : 'left');
      } else {
        handlersRef.current.onSwipe?.(dy > 0 ? 'down' : 'up');
      }
    };

    const onPointerCancel = () => {
      pointerDown = false;
      clearLongPress();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      clearLongPress();
    };
  }, [ref]);
}
