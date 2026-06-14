"use client";

import { AssistantChat } from "./assistant-chat";
import { AssistantLauncher } from "./assistant-launcher";

export function AssistantWidget() {
  return (
    <>
      <AssistantLauncher />
      <AssistantChat />
    </>
  );
}

/** @deprecated Use AssistantWidget */
export const AssistantPanel = AssistantWidget;
