import { BRAND_NAME } from "@kloqra/contracts";
import type { NotificationVariant } from "@kloqra/contracts";
import {
  renderBrandedEmailHtml,
  renderBrandedEmailText,
  type BrandedEmailInput
} from "./branded-email.layout";

export type NotificationEmailLayoutInput = {
  title: string;
  body: string;
  preheader: string;
  ctaHref: string;
  ctaLabel: string;
  variant?: NotificationVariant;
  details?: { label: string; value: string }[];
};

function toBrandedInput(input: NotificationEmailLayoutInput): BrandedEmailInput {
  return {
    title: input.title,
    body: input.body,
    preheader: input.preheader,
    ctaHref: input.ctaHref,
    ctaLabel: input.ctaLabel,
    variant: input.variant,
    details: input.details,
    footer: `You received this because of your ${BRAND_NAME} notification settings.`
  };
}

export function renderNotificationEmailHtml(input: NotificationEmailLayoutInput): string {
  return renderBrandedEmailHtml(toBrandedInput(input));
}

export function renderNotificationEmailText(input: NotificationEmailLayoutInput): string {
  return renderBrandedEmailText(toBrandedInput(input));
}
