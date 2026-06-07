"use client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Button
} from "@chronomint/ui";
import { Clock, Trash2, Square } from "lucide-react";

interface StaleTimerDialogProps {
  open: boolean;
  elapsedHours: number;
  thresholdHours: number;
  onKeepRunning: () => void;
  onStopAndSave: () => void;
  onDiscard: () => void;
}

export function StaleTimerDialog({
  open,
  elapsedHours,
  thresholdHours,
  onKeepRunning,
  onStopAndSave,
  onDiscard
}: StaleTimerDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/15">
              <Clock className="size-5 text-amber-500" />
            </span>
            <AlertDialogTitle>Timer Still Running</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Your timer has been running for <strong>{elapsedHours.toFixed(1)} hours</strong>, which
            exceeds your {thresholdHours}h daily progress goal. Did you forget to stop it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
          <AlertDialogAction asChild>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/95"
              onClick={onKeepRunning}
            >
              Keep running — I&apos;m still working
            </Button>
          </AlertDialogAction>
          <AlertDialogAction asChild>
            <Button variant="outline" className="w-full" onClick={onStopAndSave}>
              <Square className="size-4 mr-2 fill-current" />
              Stop & save logged time
            </Button>
          </AlertDialogAction>
          <AlertDialogCancel asChild>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDiscard}
            >
              <Trash2 className="size-4 mr-2" />
              Discard — timer was left running by mistake
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
