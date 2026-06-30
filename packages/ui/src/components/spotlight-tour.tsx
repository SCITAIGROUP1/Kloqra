"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/utils.js";
import { Button } from "./ui/button.js";

export type SpotlightTourStep = {
  /** CSS selector, e.g. `[data-tour="nav-timer"]` */
  target: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Shown when target element is not visible (mobile / collapsed sidebar) */
  mobileHint?: string;
};

export type SpotlightTourProps = {
  steps: SpotlightTourStep[];
  open: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
};

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const PADDING = 8;
const TOOLTIP_GAP = 12;
const Z_INDEX = 9999;

function isElementVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
    return false;
  }
  return true;
}

function getTargetRect(el: Element): Rect {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2
  };
}

function computeTooltipPosition(
  targetRect: Rect,
  tooltipWidth: number,
  tooltipHeight: number,
  placement: SpotlightTourStep["placement"]
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 16;

  if (placement === "center" || !placement) {
    return {
      top: Math.max(margin, (vh - tooltipHeight) / 2),
      left: Math.max(margin, (vw - tooltipWidth) / 2)
    };
  }

  let top = 0;
  let left = 0;

  switch (placement) {
    case "bottom":
      top = targetRect.top + targetRect.height + TOOLTIP_GAP;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case "top":
      top = targetRect.top - tooltipHeight - TOOLTIP_GAP;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left + targetRect.width + TOOLTIP_GAP;
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - TOOLTIP_GAP;
      break;
  }

  top = Math.max(margin, Math.min(top, vh - tooltipHeight - margin));
  left = Math.max(margin, Math.min(left, vw - tooltipWidth - margin));

  return { top, left };
}

export function SpotlightTour({ steps, open, onComplete, onSkip }: SpotlightTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [fallbackMode, setFallbackMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const updatePosition = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.target);
    if (!el || !isElementVisible(el)) {
      setFallbackMode(true);
      setTargetRect(null);
      const tooltipEl = tooltipRef.current;
      const tw = tooltipEl?.offsetWidth ?? 320;
      const th = tooltipEl?.offsetHeight ?? 200;
      setTooltipPos(
        computeTooltipPosition({ top: 0, left: 0, width: 0, height: 0 }, tw, th, "center")
      );
      return;
    }

    setFallbackMode(false);
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });

    requestAnimationFrame(() => {
      const rect = getTargetRect(el);
      setTargetRect(rect);

      const tooltipEl = tooltipRef.current;
      const tw = tooltipEl?.offsetWidth ?? 320;
      const th = tooltipEl?.offsetHeight ?? 200;
      const placement = step.placement ?? "right";
      setTooltipPos(computeTooltipPosition(rect, tw, th, placement));
    });
  }, [step]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;

    updatePosition();

    const ro = new ResizeObserver(() => updatePosition());
    ro.observe(document.documentElement);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, stepIndex, step, updatePosition]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleNext = () => {
    if (isLast) {
      onComplete?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setStepIndex((i) => i - 1);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  if (!open || !mounted || !step) return null;

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: Z_INDEX }}
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {/* Overlay with spotlight cutout */}
      {targetRect && !fallbackMode ? (
        <div
          className="pointer-events-none fixed rounded-lg transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)"
          }}
          aria-hidden
        />
      ) : (
        <div className="fixed inset-0 bg-black/55" aria-hidden />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed w-[min(360px,calc(100vw-32px))] rounded-xl border border-border/80 bg-popover p-5 shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        style={{ top: tooltipPos.top, left: tooltipPos.left, zIndex: Z_INDEX + 1 }}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Tour · {stepIndex + 1} of {steps.length}
          </span>
        </div>
        <h3 className="text-base font-semibold tracking-tight">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        {fallbackMode && step.mobileHint ? (
          <p className="mt-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {step.mobileHint}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={isFirst}
            className={cn("text-xs", isFirst && "invisible")}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="text-xs"
            >
              Skip tour
            </Button>
            <Button type="button" size="sm" onClick={handleNext} className="text-xs">
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
