"use client";

import * as React from "react";
import { cn } from "../../lib/utils.js";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./dialog.js";
import { modalIconWrapVariants, type ModalSize, type ModalTone } from "./modal-styles.js";

export type AppModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: ModalTone;
  size?: ModalSize;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  showClose?: boolean;
  className?: string;
  bodyClassName?: string;
  onInteractOutside?: (event: Event) => void;
};

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone = "default",
  size = "md",
  children,
  footer,
  showClose = true,
  className,
  bodyClassName,
  onInteractOutside
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={size}
        showClose={showClose}
        className={className}
        onInteractOutside={onInteractOutside}
      >
        <DialogHeader>
          {icon ? <div className={cn(modalIconWrapVariants({ tone }))}>{icon}</div> : null}
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? <DialogBody className={bodyClassName}>{children}</DialogBody> : null}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
