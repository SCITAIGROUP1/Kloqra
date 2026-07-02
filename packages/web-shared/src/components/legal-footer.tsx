"use client";

import { LEGAL_URL_ENV } from "@kloqra/contracts";

function readLegalUrl(key: string): string | null {
  const value = process.env[key]?.trim();
  return value || null;
}

export function getLegalUrls() {
  return {
    tos: readLegalUrl(LEGAL_URL_ENV.TOS),
    privacy: readLegalUrl(LEGAL_URL_ENV.PRIVACY),
    refund: readLegalUrl(LEGAL_URL_ENV.REFUND)
  };
}

export function LegalFooterLinks({ className }: { className?: string }) {
  const { tos, privacy } = getLegalUrls();
  if (!tos && !privacy) return null;

  return (
    <span className={className}>
      {tos ? (
        <a href={tos} target="_blank" rel="noopener noreferrer" className="hover:underline">
          Terms
        </a>
      ) : null}
      {tos && privacy ? <span className="mx-1">·</span> : null}
      {privacy ? (
        <a href={privacy} target="_blank" rel="noopener noreferrer" className="hover:underline">
          Privacy
        </a>
      ) : null}
    </span>
  );
}
