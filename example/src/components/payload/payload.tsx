import { useState } from "react";
import { RelayIdentityCard } from "./tabs/relay-identity-card";
import { PlaceOrderTab } from "./tabs/place-order-tab";
import { SellOrderUpiTab } from "./tabs/sell-order-upi-tab";
import { EncryptDecryptTab } from "./tabs/encrypt-decrypt-tab";

const SUB_TABS = ["placeOrder()", "setSellOrderUpi()", "Encrypt / Decrypt"] as const;
type SubTab = (typeof SUB_TABS)[number];

export const Payload = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("placeOrder()");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleResult(value: string) {
    setError(null);
    setResult(value);
  }

  function handleError(value: string) {
    setResult(null);
    setError(value);
  }

  return (
    <div className="container">
      <RelayIdentityCard />

      <div className="sub-tabs">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`sub-tab ${activeSubTab === tab ? "sub-tab-active" : ""}`}
            onClick={() => { setActiveSubTab(tab); setResult(null); setError(null); }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeSubTab === "placeOrder()" && (
        <PlaceOrderTab onResult={handleResult} onError={handleError} />
      )}

      {activeSubTab === "setSellOrderUpi()" && (
        <SellOrderUpiTab onResult={handleResult} onError={handleError} />
      )}

      {activeSubTab === "Encrypt / Decrypt" && (
        <EncryptDecryptTab onResult={handleResult} onError={handleError} />
      )}

      {result && (
        <div className="result-success">
          <div className="result-header">
            <button type="button" className="btn-copy" onClick={() => {
              navigator.clipboard.writeText(result);
            }}>Copy</button>
          </div>
          <pre>{result}</pre>
        </div>
      )}
      {error && <pre className="result-error">{error}</pre>}
    </div>
  );
};
