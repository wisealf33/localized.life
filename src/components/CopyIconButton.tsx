"use client";

import { useState } from "react";

type CopyIconButtonProps = {
  text: string;
  label: string;
};

export function CopyIconButton({ text, label }: CopyIconButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="icon-button" type="button" aria-label={label} title={label} onClick={copy}>
      {copied ? (
        "OK"
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <rect x="8" y="7" width="10" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
}
