"use client";

import { useState } from "react";
import { pawpawWallets } from "@/data/pawpaw-revival";

export function PawpawCryptoWallets() {
  const [copiedChainId, setCopiedChainId] = useState<number | null>(null);

  async function copyAddress(chainId: number, address: string) {
    await navigator.clipboard.writeText(address);
    setCopiedChainId(chainId);
    window.setTimeout(() => setCopiedChainId(null), 1800);
  }

  return (
    <div className="pawpaw-wallet-grid">
      {pawpawWallets.map((wallet) => (
        <article className="pawpaw-wallet-card" key={wallet.chainId}>
          <div>
            <span className="harvest-type">{wallet.symbol}</span>
            <h3>{wallet.chainName}</h3>
          </div>
          <code>{wallet.address}</code>
          <div className="pawpaw-wallet-actions">
            <button className="button harvest-primary" type="button" onClick={() => copyAddress(wallet.chainId, wallet.address)}>
              {copiedChainId === wallet.chainId ? "Copied" : "Copy address"}
            </button>
            <a className="button harvest-secondary" href={wallet.explorer} rel="noopener noreferrer" target="_blank">
              Explorer
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
