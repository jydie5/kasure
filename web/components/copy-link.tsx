"use client";

import { useState } from "react";

export function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? "コピーしました" : "リンクをコピー"}
    </button>
  );
}
