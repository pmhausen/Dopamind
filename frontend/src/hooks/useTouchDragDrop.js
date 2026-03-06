import { useRef, useCallback } from "react";

const LONG_PRESS_DELAY = 500; // ms
const SCROLL_TOLERANCE = 8;   // px — movement within this range doesn't cancel drag

// Ghost visual constants
const GHOST_SCALE = 1.04;    // slight scale-up so it floats above the source
const GHOST_ROTATE = 1.5;    // subtle tilt makes it look "picked up"
const GHOST_OPACITY = 0.92;  // nearly opaque so it is clearly readable
const GHOST_Z = 9999;        // must sit above all app content
const GHOST_EL_ID = "touch-drag-ghost"; // single ghost — guarded by removeVisualFeedback

/**
 * useTouchDragDrop — provides touch-based drag-and-drop support.
 *
 * Uses a native (non-passive) touchmove listener so e.preventDefault() works
 * and page scrolling is suppressed during an active drag.
 *
 * Visual feedback:
 *  - The dragged element is dimmed in place (showing its origin).
 *  - A ghost clone follows the finger so the user sees what they are moving.
 *  - The currently hovered drop zone gets a `touch-drop-active` class for
 *    a highlight ring so the user knows where the item will land.
 *
 * Usage:
 *   const { getTouchDragProps, getTouchDropProps } = useTouchDragDrop({ onDrop });
 *   <div {...getTouchDragProps(myData)} />
 *   <div {...getTouchDropProps(dropId)} />
 */
export function useTouchDragDrop({ onDrop }) {
  // Store onDrop in a ref so getTouchDragProps remains stable across renders
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const stateRef = useRef({
    dragData: null,
    dragEl: null,
    startX: 0,
    startY: 0,
    longPressTimer: null,
    isDragging: false,
    nativeMoveHandler: null, // native touchmove handler (non-passive)
    ghost: null,             // floating clone element following the finger
    ghostOriginLeft: 0,      // ghost's left position when drag activated
    ghostOriginTop: 0,       // ghost's top position when drag activated
    currentDropTarget: null, // data-droptarget id currently highlighted
  });

  /** Remove the ghost element and any drop-zone highlights. */
  const removeVisualFeedback = useCallback(() => {
    const s = stateRef.current;
    if (s.ghost) {
      s.ghost.remove();
      s.ghost = null;
    }
    if (s.currentDropTarget) {
      document
        .querySelectorAll(`[data-droptarget="${s.currentDropTarget}"]`)
        .forEach((el) => el.classList.remove("touch-drop-active"));
      s.currentDropTarget = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    const s = stateRef.current;
    if (s.longPressTimer) {
      clearTimeout(s.longPressTimer);
      s.longPressTimer = null;
    }
    if (s.dragEl) {
      s.dragEl.classList.remove("touch-dragging");
      // Remove the non-passive native listener to avoid leaks
      if (s.nativeMoveHandler) {
        s.dragEl.removeEventListener("touchmove", s.nativeMoveHandler);
        s.nativeMoveHandler = null;
      }
    }
    document.body.classList.remove("touch-drag-active");
    removeVisualFeedback();
    s.dragData = null;
    s.dragEl = null;
    s.isDragging = false;
  }, [removeVisualFeedback]);

  const getTouchDragProps = useCallback((dragData) => ({
    onTouchStart(e) {
      // Ignore multi-touch — only allow single-finger drag
      if (e.touches.length > 1) {
        // If a drag was pending, cancel it
        const s = stateRef.current;
        if (s.longPressTimer) {
          clearTimeout(s.longPressTimer);
          s.longPressTimer = null;
        }
        if (s.isDragging) {
          cleanup();
        }
        return;
      }
      const touch = e.touches[0];
      const s = stateRef.current;
      s.startX = touch.clientX;
      s.startY = touch.clientY;
      s.dragData = dragData;
      s.dragEl = e.currentTarget;

      s.longPressTimer = setTimeout(() => {
        s.isDragging = true;
        s.dragEl.classList.add("touch-dragging");
        document.body.classList.add("touch-drag-active");
        if (typeof navigator.vibrate === "function") navigator.vibrate(50);

        // ── Ghost element ──────────────────────────────────────────────
        // Create a floating clone of the dragged element that follows the
        // finger so the user has clear visual feedback of what they are
        // moving and where it will land.
        // Remove any stale ghost first (safety guard against cleanup failures).
        document.getElementById(GHOST_EL_ID)?.remove();
        const rect = s.dragEl.getBoundingClientRect();
        const ghost = s.dragEl.cloneNode(true);
        ghost.id = GHOST_EL_ID;
        ghost.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          margin: 0;
          pointer-events: none;
          z-index: ${GHOST_Z};
          opacity: ${GHOST_OPACITY};
          transform: scale(${GHOST_SCALE}) rotate(${GHOST_ROTATE}deg);
          box-shadow: 0 12px 32px rgba(0,0,0,0.22);
          transition: none;
        `;
        document.body.appendChild(ghost);
        s.ghost = ghost;
        s.ghostOriginLeft = rect.left;
        s.ghostOriginTop = rect.top;
      }, LONG_PRESS_DELAY);

      // Register a non-passive touchmove listener directly on the element.
      // React registers touch listeners as passive, making e.preventDefault() a
      // no-op. A native {passive:false} listener is the only reliable way to
      // prevent the page from scrolling while a drag is in progress.
      const nativeMoveHandler = (e) => {
        // Abort drag if multiple fingers are detected
        if (e.touches.length > 1) {
          cleanup();
          return;
        }
        const t = e.touches[0];
        if (!t) return;
        const dx = t.clientX - s.startX;
        const dy = t.clientY - s.startY;

        if (!s.isDragging) {
          // Cancel long-press if finger moves too much before threshold
          if (Math.abs(dx) > SCROLL_TOLERANCE || Math.abs(dy) > SCROLL_TOLERANCE) {
            if (s.longPressTimer) {
              clearTimeout(s.longPressTimer);
              s.longPressTimer = null;
            }
          }
          return;
        }

        // Suppress page scroll during active drag
        e.preventDefault();

        // ── Move ghost ───────────────────────────────────────────────
        if (s.ghost) {
          s.ghost.style.left = `${s.ghostOriginLeft + dx}px`;
          s.ghost.style.top = `${s.ghostOriginTop + dy}px`;
        }

        // ── Highlight current drop target ────────────────────────────
        // Ghost has pointer-events:none so elementFromPoint sees through it.
        const elUnder = document.elementFromPoint(t.clientX, t.clientY);
        let dropUnder = elUnder;
        while (dropUnder && !dropUnder.dataset.droptarget) {
          dropUnder = dropUnder.parentElement;
        }
        const newTargetId = dropUnder?.dataset?.droptarget ?? null;

        if (newTargetId !== s.currentDropTarget) {
          if (s.currentDropTarget) {
            document
              .querySelectorAll(`[data-droptarget="${s.currentDropTarget}"]`)
              .forEach((el) => el.classList.remove("touch-drop-active"));
          }
          if (newTargetId) {
            document
              .querySelectorAll(`[data-droptarget="${newTargetId}"]`)
              .forEach((el) => el.classList.add("touch-drop-active"));
          }
          s.currentDropTarget = newTargetId;
        }
      };

      s.nativeMoveHandler = nativeMoveHandler;
      e.currentTarget.addEventListener("touchmove", nativeMoveHandler, { passive: false });
    },

    onTouchEnd(e) {
      const s = stateRef.current;

      if (s.longPressTimer) {
        clearTimeout(s.longPressTimer);
        s.longPressTimer = null;
      }

      if (!s.isDragging) {
        cleanup();
        return;
      }

      // Determine drop target from touch position
      const touch = e.changedTouches[0];
      // Temporarily hide dragging element so elementFromPoint can find what's below
      if (s.dragEl) s.dragEl.style.pointerEvents = "none";
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (s.dragEl) s.dragEl.style.pointerEvents = "";

      // Walk up DOM to find nearest element with data-droptarget
      let dropEl = el;
      while (dropEl && !dropEl.dataset.droptarget) {
        dropEl = dropEl.parentElement;
      }

      if (dropEl && dropEl.dataset.droptarget && onDropRef.current) {
        onDropRef.current(s.dragData, dropEl.dataset.droptarget);
      }

      cleanup();
    },

    onTouchCancel() {
      cleanup();
    },
  }), [cleanup]);

  const getTouchDropProps = useCallback((dropId) => ({
    "data-droptarget": dropId,
  }), []);

  return { getTouchDragProps, getTouchDropProps };
}
