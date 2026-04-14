import { useState } from "react";
import { getRelayIdentity } from "@p2pdotme/sdk/payload";

const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relay-identity-field">
      <strong>{label}:</strong> {value.slice(0, 20)}...
      <button type="button" className="btn-copy" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
};

export const RelayIdentityCard = () => {
  const relayIdentity = getRelayIdentity();
  const relayData = relayIdentity.isOk() ? relayIdentity.value : null;

  if (!relayData) return null;

  return (
    <div className="relay-identity">
      <div className="relay-identity-header">
        Relay Identity <span className="relay-identity-badge">from localStorage</span>
      </div>
      <CopyField label="Address" value={relayData.address} />
      <CopyField label="Public Key" value={relayData.publicKey} />
      <CopyField label="Private Key" value={relayData.privateKey} />
    </div>
  );
};
