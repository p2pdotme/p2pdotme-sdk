import { useState } from "react";
import { parseUnits, type Address } from "viem";
import { useOrderRouter } from "@p2pdotme/sdk/react";
import { CURRENCIES } from "../../constants";
import type { Currency } from "../../types";
import { CustomInput } from "../atoms";
const USDC_DECIMALS = 6;

export const OrderRouting = () => {
  const [currency, setCurrency] = useState<Currency>(CURRENCIES.INR);
  const [userAddress, setUserAddress] = useState("");
  const [usdcAmount, setUsdcAmount] = useState("10");
  const [exchangeRate, setExchangeRate] = useState("85");
  const [orderType, setOrderType] = useState("0");
  const [preferredPCConfigId, setPreferredPCConfigId] = useState("0");

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useOrderRouter();

  const fiatDisplay =
    usdcAmount && exchangeRate
      ? (Number(usdcAmount) * Number(exchangeRate)).toFixed(2)
      : "0";

  async function handleSelectCircle() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const usdcAmountWei = parseUnits(usdcAmount, USDC_DECIMALS);
      const fiatAmountWei = parseUnits(fiatDisplay, USDC_DECIMALS);

      const res = await router.selectCircle({
        currency,
        user: userAddress as Address,
        usdtAmount: usdcAmountWei,
        fiatAmount: fiatAmountWei,
        orderType: BigInt(orderType),
        preferredPCConfigId: BigInt(preferredPCConfigId),
      });

      res.match(
        (circleId) => setResult(`circleId: ${circleId.toString()}`),
        (err) => setError(`[${err.code}] ${err.message}`),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }

    setLoading(false);
  }

  return (
    <div className="container">
      <fieldset>
        <legend>Order Params</legend>
        <div className="field">
          <label>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <CustomInput
          label="User Address"
          value={userAddress}
          onChange={setUserAddress}
          placeholder="0x..."
        />
        <CustomInput
          label="USDC Amount"
          value={usdcAmount}
          onChange={setUsdcAmount}
          placeholder="e.g. 10"
        />
        <CustomInput
          label="Exchange Rate (1 USDC = ? fiat)"
          value={exchangeRate}
          onChange={setExchangeRate}
          placeholder="e.g. 85"
        />

        <div className="fiat-display">
          <strong>Fiat Amount (auto):</strong> {fiatDisplay} {currency}
        </div>

        <div className="field">
          <label>Order Type</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
          >
            <option value="0">Buy (0)</option>
            <option value="1">Sell (1)</option>
            <option value="2">Pay (2)</option>
          </select>
        </div>

        <CustomInput
          label="Preferred PC Config ID"
          value={preferredPCConfigId}
          onChange={setPreferredPCConfigId}
        />
      </fieldset>

      <button
        type="button"
        className="btn-primary"
        onClick={handleSelectCircle}
        disabled={loading}
      >
        {loading ? "Routing..." : "Find Circle"}
      </button>

      {result && <pre className="result-success">{result}</pre>}
      {error && <pre className="result-error">{error}</pre>}
    </div>
  );
};
