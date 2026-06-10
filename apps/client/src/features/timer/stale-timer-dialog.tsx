"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  modalIconWrapVariants
} from "@kloqra/ui";
import { Clock, Square, Trash2 } from "lucide-react";

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
      <AlertDialogContent size="md">
        <AlertDialogHeader>
          <div className={modalIconWrapVariants({ tone: "warning" })}>
            <Clock className="size-5" />
          </div>
          <AlertDialogTitle>Timer still running</AlertDialogTitle>
          <AlertDialogDescription>
            Your timer has been running for <strong>{elapsedHours.toFixed(1)} hours</strong>, which
            exceeds your {thresholdHours}h daily progress goal. Did you forget to stop it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction asChild>
            <Button className="w-full" onClick={onKeepRunning}>
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
