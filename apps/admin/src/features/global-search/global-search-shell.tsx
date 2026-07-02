"use client";

import { useEffect, useState } from "react";
import { GlobalSearchDialog } from "./global-search-dialog";

type GlobalSearchShellProps = {
  workspaceId: string;
  isOwner?: boolean;
};

export function GlobalSearchShell({ workspaceId, isOwner = false }: GlobalSearchShellProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key?.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [workspaceId]);

  return (
    <>
      <p className="sr-only">Press Command+K or Control+K to open search.</p>
      <GlobalSearchDialog
        open={open}
        onOpenChange={setOpen}
        workspaceId={workspaceId}
        isOwner={isOwner}
      />
    </>
  );
}
