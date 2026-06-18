"use client";

import {
  ROUTES,
  isShareableWidgetId,
  type WidgetShareDto,
  type WidgetShareTier1Id
} from "@kloqra/contracts";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@kloqra/ui";
import { Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { buildWidgetShareDateRange } from "./widget-share-utils";
import { api } from "@/lib/api";

export type WidgetShareButtonProps = {
  workspaceId: string;
  widgetId: string;
  widgetLabel: string;
  startDate: string;
  endDate: string;
  projectId?: string | string[];
  userId?: string | string[];
  categoryId?: string;
  taskId?: string;
  options?: Record<string, unknown>;
};

export function WidgetShareButton({
  workspaceId,
  widgetId,
  widgetLabel,
  startDate,
  endDate,
  projectId,
  userId,
  categoryId,
  taskId,
  options
}: WidgetShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  if (!isShareableWidgetId(widgetId)) {
    return null;
  }

  async function createShareLink() {
    if (!workspaceId) return;
    setSharing(true);
    setShareUrl(null);
    try {
      const { from, to } = buildWidgetShareDateRange(startDate, endDate);
      const result = await api<WidgetShareDto>(ROUTES.REPORTING.WIDGET_SHARES, {
        method: "POST",
        workspaceId,
        body: JSON.stringify({
          body: {
            widgetId: widgetId as WidgetShareTier1Id,
            from,
            to,
            ...(projectId ? { projectId } : {}),
            ...(userId ? { userId } : {}),
            ...(categoryId ? { categoryId } : {}),
            ...(taskId ? { taskId } : {}),
            ...(options ? { options } : {})
          },
          expiresInDays: 30
        })
      });
      setShareUrl(result.shareUrl);
      toast.success("Share link created.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create share link.";
      toast.error(message);
    } finally {
      setSharing(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Could not copy link.");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-foreground"
        aria-label={`Share ${widgetLabel} publicly`}
        title="Create read-only share link"
        onClick={() => {
          setShareUrl(null);
          setOpen(true);
          void createShareLink();
        }}
        disabled={sharing}
      >
        <Share2 className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share {widgetLabel}</DialogTitle>
            <DialogDescription>
              Anyone with this link can view a read-only snapshot of this widget for 30 days.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {sharing ? (
              <p className="text-sm text-muted-foreground">Creating link…</p>
            ) : shareUrl ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs break-all">
                <p className="font-medium text-foreground mb-1">Share link (30 days)</p>
                <a
                  href={shareUrl}
                  className="text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {shareUrl}
                </a>
              </div>
            ) : (
              <p className="text-sm text-destructive">Could not create a share link.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {shareUrl ? (
              <Button type="button" onClick={() => void copyLink()}>
                Copy link
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
