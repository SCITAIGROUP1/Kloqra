import { cva } from "class-variance-authority";

export const modalOverlayClass =
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const modalContentVariants = cva(
  "fixed left-1/2 top-1/2 z-[60] flex w-[calc(100vw-2rem)] max-h-[min(90dvh,calc(100vh-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-primary/10 bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
  {
    variants: {
      size: {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-xl",
        xl: "max-w-2xl"
      }
    },
    defaultVariants: {
      size: "md"
    }
  }
);

export const modalAccentBarClass =
  "h-1 w-full shrink-0 bg-gradient-to-r from-primary/70 via-primary to-primary/50";

export const modalHeaderClass =
  "relative shrink-0 space-y-1.5 border-b border-border/60 bg-muted/20 px-6 py-5 pr-12 text-left";

export const modalBodyClass = "min-h-0 flex-1 overflow-y-auto px-6 py-5";

export const modalFooterClass =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3";

export const modalCloseButtonClass =
  "absolute right-4 top-4 z-10 rounded-lg p-1.5 text-muted-foreground opacity-80 ring-offset-background transition-opacity hover:bg-muted hover:text-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none";

export const modalIconWrapVariants = cva(
  "mb-3 inline-flex size-11 items-center justify-center rounded-xl border shadow-sm",
  {
    variants: {
      tone: {
        default: "border-primary/15 bg-primary/10 text-primary",
        warning: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        destructive: "border-destructive/25 bg-destructive/10 text-destructive"
      }
    },
    defaultVariants: {
      tone: "default"
    }
  }
);

export type ModalSize = NonNullable<Parameters<typeof modalContentVariants>[0]>["size"];
export type ModalTone = NonNullable<Parameters<typeof modalIconWrapVariants>[0]>["tone"];
