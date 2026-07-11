const MOBILE_MAX_WIDTH = 767;
const COMPACT_MAX_WIDTH = 1023;
const KEYBOARD_MIN_INSET = 120;

export function calculateResponsiveViewport({
  width,
  layoutHeight,
  visualHeight,
  visualOffsetTop = 0,
  stableHeight = layoutHeight,
  editableFocused = false,
}) {
  const viewportWidth = Math.max(0, Math.round(Number(width) || 0));
  const viewportHeight = Math.max(0, Math.round(Number(visualHeight || layoutHeight) || 0));
  const offsetTop = Math.max(0, Math.round(Number(visualOffsetTop) || 0));
  const keyboardInset = editableFocused
    ? Math.max(0, Math.round((Number(stableHeight) || viewportHeight) - viewportHeight - offsetTop))
    : 0;
  return {
    width: viewportWidth,
    height: viewportHeight,
    offsetTop,
    keyboardInset,
    keyboardOpen: editableFocused && keyboardInset >= KEYBOARD_MIN_INSET,
    mode: viewportWidth <= MOBILE_MAX_WIDTH
      ? "mobile"
      : viewportWidth <= COMPACT_MAX_WIDTH ? "compact" : "desktop",
  };
}

export function attachResponsiveViewport(windowRef = window, documentRef = document) {
  const root = documentRef.documentElement;
  const visualViewport = windowRef.visualViewport;
  let stableHeight = Math.max(windowRef.innerHeight || 0, visualViewport?.height || 0);
  let animationFrame = 0;
  let keyboardWasOpen = false;
  let settleTimer = 0;

  const isEditableFocused = () => {
    const element = documentRef.activeElement;
    return Boolean(element?.matches?.("input, textarea, select, [contenteditable='true']"));
  };

  const applyViewport = () => {
    animationFrame = 0;
    const editableFocused = isEditableFocused();
    const visualHeight = visualViewport?.height || windowRef.innerHeight || stableHeight;
    const visualOffsetTop = visualViewport?.offsetTop || 0;
    const compressedInset = Math.max(0, stableHeight - visualHeight - visualOffsetTop);
    const keyboardTransitionActive = keyboardWasOpen && compressedInset >= KEYBOARD_MIN_INSET;
    if (!editableFocused && !keyboardTransitionActive) {
      stableHeight = Math.max(stableHeight, visualHeight, windowRef.innerHeight || 0);
    }
    const snapshot = calculateResponsiveViewport({
      width: visualViewport?.width || windowRef.innerWidth,
      layoutHeight: windowRef.innerHeight,
      visualHeight,
      visualOffsetTop,
      stableHeight,
      editableFocused: editableFocused || keyboardTransitionActive,
    });

    root.style.setProperty("--app-viewport-height", `${snapshot.height}px`);
    root.style.setProperty("--app-viewport-offset-top", `${snapshot.offsetTop}px`);
    root.style.setProperty("--keyboard-inset", `${snapshot.keyboardInset}px`);
    root.dataset.viewportMode = snapshot.mode;
    root.dataset.keyboardOpen = snapshot.keyboardOpen ? "true" : "false";

    if (snapshot.keyboardOpen && !keyboardWasOpen) {
      const focusedElement = documentRef.activeElement;
      if (!focusedElement?.closest?.(".platform-login-panel")) {
        focusedElement?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      }
    }
    keyboardWasOpen = snapshot.keyboardOpen;
  };

  const scheduleViewport = () => {
    if (animationFrame) return;
    animationFrame = windowRef.requestAnimationFrame(applyViewport);
  };

  const resetStableHeight = () => {
    stableHeight = Math.max(windowRef.innerHeight || 0, visualViewport?.height || 0);
    keyboardWasOpen = false;
    scheduleViewport();
  };

  const settleAfterFocus = () => {
    windowRef.clearTimeout(settleTimer);
    settleTimer = windowRef.setTimeout(() => {
      scheduleViewport();
    }, 320);
  };

  windowRef.addEventListener("resize", scheduleViewport, { passive: true });
  windowRef.addEventListener("orientationchange", resetStableHeight, { passive: true });
  visualViewport?.addEventListener("resize", scheduleViewport, { passive: true });
  visualViewport?.addEventListener("scroll", scheduleViewport, { passive: true });
  documentRef.addEventListener("focusin", scheduleViewport);
  documentRef.addEventListener("focusout", settleAfterFocus);
  applyViewport();

  return () => {
    if (animationFrame) windowRef.cancelAnimationFrame(animationFrame);
    windowRef.clearTimeout(settleTimer);
    windowRef.removeEventListener("resize", scheduleViewport);
    windowRef.removeEventListener("orientationchange", resetStableHeight);
    visualViewport?.removeEventListener("resize", scheduleViewport);
    visualViewport?.removeEventListener("scroll", scheduleViewport);
    documentRef.removeEventListener("focusin", scheduleViewport);
    documentRef.removeEventListener("focusout", settleAfterFocus);
  };
}
