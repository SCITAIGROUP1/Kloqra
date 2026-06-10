import { cva } from "class-variance-authority";

/**
 * Shared shell spacing — keeps sidebar brand, app bar title, and page body on one grid.
 */
export const shellInsetXClass = "px-6 lg:px-8";

export const shellHeaderBandYClass = "py-5";

export const shellMainContentClass = `${shellInsetXClass} pb-6 lg:pb-8`;

/** Shared layout shell surfaces */
export const shellSidebarClass =
  "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/80 bg-card shadow-sm transition-all duration-300 ease-in-out md:flex";

/** Narrow rail — wide enough for 36px controls with minimal inset */
export const shellSidebarCollapsedWidthClass = "w-[5rem]";

export const shellSidebarExpandedWidthClass = "w-[17rem]";

export const shellSidebarCollapsedInsetClass = "px-2";

export const shellSidebarScrollClass = `flex flex-1 flex-col overflow-y-auto ${shellInsetXClass} ${shellHeaderBandYClass} transition-all duration-300`;

export const shellSidebarScrollCollapsedClass = `flex flex-1 flex-col items-center overflow-y-auto ${shellSidebarCollapsedInsetClass} py-4 transition-all duration-300`;

export const shellSidebarFooterClass = `shrink-0 border-t border-border/70 bg-card ${shellInsetXClass} py-4 transition-all duration-300`;

export const shellSidebarFooterCollapsedClass = `flex shrink-0 flex-col items-center border-t border-border/70 bg-card ${shellSidebarCollapsedInsetClass} py-3 transition-all duration-300`;

export const shellMainClass = "min-h-screen min-w-0 flex-1 overflow-y-auto bg-muted/20";

export const shellMobileHeaderClass =
  "sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-card/90 px-4 backdrop-blur-md md:hidden";

export const shellMobileDrawerClass =
  "fixed inset-y-0 left-0 z-50 flex h-full w-[17rem] flex-col border-r border-border/80 bg-card p-4 shadow-xl transition-transform duration-300 ease-in-out md:hidden";

/** App bar — negative margin pairs with `shellMainContentClass` horizontal inset */
export const shellAppBarClass = `sticky top-0 z-30 -mx-6 mb-6 border-b border-border/80 bg-background/95 backdrop-blur-md lg:-mx-8 ${shellInsetXClass} ${shellHeaderBandYClass}`;

export const shellAppBarPrimaryRowClass =
  "flex min-h-10 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between";

export const shellAppBarSecondaryRowClass =
  "flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between";

export const shellAppBarTitleClass = "text-2xl font-semibold tracking-tight";

export const shellAppBarDescriptionClass = "max-w-2xl text-sm text-muted-foreground";

export const appBarToolbarClass = "flex flex-wrap items-center gap-2.5";

export const appBarToolbarSeparatorClass = "mx-1 hidden h-8 w-px shrink-0 bg-border/80 sm:block";

export const appBarIconSizeClass = "size-5";

export const appBarIconButtonVariants = cva(
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-5",
  {
    variants: {
      active: {
        true: "border-primary/30 bg-primary/5 text-foreground",
        false: ""
      }
    },
    defaultVariants: {
      active: false
    }
  }
);

export const appBarActionButtonVariants = cva(
  "h-10 gap-2 border-border/80 bg-card px-3.5 text-sm shadow-none",
  {
    variants: {
      active: {
        true: "border-primary/30 bg-primary/5 text-foreground",
        false: ""
      }
    },
    defaultVariants: {
      active: false
    }
  }
);

export const userAvatarVariants = cva(
  "flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90",
  {
    variants: {
      size: {
        sm: "h-10 w-10 text-xs",
        md: "h-11 w-11 text-sm"
      }
    },
    defaultVariants: {
      size: "sm"
    }
  }
);

/** Menus (appearance, widget actions, etc.) */
export const shellMenuPanelClass =
  "absolute right-0 top-full z-50 mt-1.5 min-w-[10.5rem] rounded-lg border border-border/80 bg-card p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150";

export const shellMenuItemVariants = cva(
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary/10 text-foreground",
        false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      },
      tone: {
        default: "",
        destructive: "text-destructive hover:bg-muted hover:text-destructive"
      }
    },
    defaultVariants: {
      active: false,
      tone: "default"
    }
  }
);

/** Sidebar user footer */
export const sidebarProfileLinkClass =
  "flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-muted/40";

export const sidebarLogoutButtonClass =
  "flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground";

export const sidebarCollapsedLogoutButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground";

/** Dashboard widget shell */
export const widgetShellVariants = cva(
  "widget-shell relative flex h-full w-full flex-col overflow-hidden border border-border/80 bg-card/90 backdrop-blur-sm transition-all duration-300 animate-in fade-in zoom-in-95",
  {
    variants: {
      editing: {
        true: "cursor-grab ring-1 ring-primary/30 shadow-sm active:cursor-grabbing",
        false: "hover:shadow-md"
      }
    },
    defaultVariants: {
      editing: false
    }
  }
);

export const widgetShellTitleClass =
  "truncate text-sm font-semibold tracking-tight text-foreground";

export const widgetShellViewToolbarClass = "mb-3 flex items-center justify-between gap-3";
