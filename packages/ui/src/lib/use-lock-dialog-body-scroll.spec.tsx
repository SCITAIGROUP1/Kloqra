import { renderHook } from "@testing-library/react";
import { createRef, type MutableRefObject } from "react";
import { useLockDialogBodyScroll } from "./use-lock-dialog-body-scroll.js";

describe("useLockDialogBodyScroll", () => {
  it("locks dialog body overflow while the popover is open", () => {
    const anchor = document.createElement("button");
    const body = document.createElement("div");
    body.setAttribute("data-dialog-body", "");
    body.style.overflow = "auto";
    body.appendChild(anchor);
    document.body.appendChild(body);

    const anchorRef = createRef<HTMLButtonElement>();
    (anchorRef as MutableRefObject<HTMLButtonElement | null>).current = anchor;

    const { rerender, unmount } = renderHook(
      ({ open }) => useLockDialogBodyScroll(open, anchorRef),
      { initialProps: { open: true } }
    );

    expect(body.style.overflow).toBe("hidden");

    rerender({ open: false });
    expect(body.style.overflow).toBe("auto");

    unmount();
    body.remove();
  });
});
