import * as React from "react";

export function useLockDialogBodyScroll(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>
) {
  React.useEffect(() => {
    if (!open) return;
    const body = anchorRef.current?.closest("[data-dialog-body]") as HTMLElement | null;
    if (!body) return;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [open, anchorRef]);
}
