import { useState } from "react";
import type { Address } from "viem";
import { useProfile } from "@p2pdotme/sdk/react";
import { CURRENCIES } from "../../constants";
import type { Currency } from "../../types";
import { CustomInput } from "../atoms";

export const Profile = () => {
  const [userAddress, setUserAddress] = useState("");
  const [currency, setCurrency] = useState<Currency>(CURRENCIES.INR);

  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [priceConfig, setPriceConfig] = useState<object | null>(null);
  const [balances, setBalances] = useState<object | null>(null);
  const [txLimits, setTxLimits] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const profile = useProfile();

  async function handleGetUsdcBalance() {
    setLoading(true);
    setError(null);
    setUsdcBalance(null);

    const res = await profile.getUsdcBalance({
      address: userAddress as Address,
    });

    res.match(
      (balance) => setUsdcBalance(balance.toString()),
      (err) => setError(`[${err.code}] ${err.message}`),
    );

    setLoading(false);
  }

  async function handleGetPriceConfig() {
    setLoading(true);
    setError(null);
    setPriceConfig(null);

    const res = await profile.getPriceConfig({ currency });

    res.match(
      (data) =>
        setPriceConfig({
          buyPrice: data.buyPrice.toString(),
          sellPrice: data.sellPrice.toString(),
          buyPriceOffset: data.buyPriceOffset.toString(),
          baseSpread: data.baseSpread.toString(),
        }),
      (err) => setError(`[${err.code}] ${err.message}`),
    );

    setLoading(false);
  }

  async function handleGetBalances() {
    setLoading(true);
    setError(null);
    setBalances(null);

    const res = await profile.getBalances({
      address: userAddress as Address,
      currency,
    });

    res.match(
      (data) => setBalances(data),
      (err) => setError(`[${err.code}] ${err.message}`),
    );

    setLoading(false);
  }

  async function handleGetTxLimits() {
    setLoading(true);
    setError(null);
    setTxLimits(null);

    const res = await profile.getTxLimits({
      address: userAddress as Address,
      currency,
    });

    res.match(
      (data) => setTxLimits(data),
      (err) => setError(`[${err.code}] ${err.message}`),
    );

    setLoading(false);
  }

  async function handleFetchAll() {
    setLoading(true);
    setError(null);
    setUsdcBalance(null);
    setPriceConfig(null);
    setBalances(null);
    setTxLimits(null);

    const [usdcRes, priceRes, balancesRes, txLimitsRes] = await Promise.all([
      profile.getUsdcBalance({ address: userAddress as Address }),
      profile.getPriceConfig({ currency }),
      profile.getBalances({ address: userAddress as Address, currency }),
      profile.getTxLimits({ address: userAddress as Address, currency }),
    ]);

    const errors: string[] = [];

    usdcRes.match(
      (balance) => setUsdcBalance(balance.toString()),
      (err) => errors.push(`[${err.code}] ${err.message}`),
    );

    priceRes.match(
      (data) =>
        setPriceConfig({
          buyPrice: data.buyPrice.toString(),
          sellPrice: data.sellPrice.toString(),
          buyPriceOffset: data.buyPriceOffset.toString(),
          baseSpread: data.baseSpread.toString(),
        }),
      (err) => errors.push(`[${err.code}] ${err.message}`),
    );

    balancesRes.match(
      (data) => setBalances(data),
      (err) => errors.push(`[${err.code}] ${err.message}`),
    );

    txLimitsRes.match(
      (data) => setTxLimits(data),
      (err) => errors.push(`[${err.code}] ${err.message}`),
    );

    if (errors.length > 0) setError(errors.join("\n"));
    setLoading(false);
  }

  return (
    <div className="container">
      <fieldset>
        <legend>Params</legend>
        <CustomInput
          label="User Address"
          value={userAddress}
          onChange={setUserAddress}
          placeholder="0x..."
        />
        <div className="field">
          <label>Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" className="btn-primary" onClick={handleGetUsdcBalance} disabled={loading}>
          {loading ? "Loading..." : "Get USDC Balance"}
        </button>
        <button type="button" className="btn-primary" onClick={handleGetPriceConfig} disabled={loading}>
          {loading ? "Loading..." : "Get Price Config"}
        </button>
        <button type="button" className="btn-primary" onClick={handleGetBalances} disabled={loading}>
          {loading ? "Loading..." : "Get Balances"}
        </button>
        <button type="button" className="btn-primary" onClick={handleGetTxLimits} disabled={loading}>
          {loading ? "Loading..." : "Get Tx Limits"}
        </button>
        <button type="button" className="btn-primary" onClick={handleFetchAll} disabled={loading}>
          {loading ? "Loading..." : "Fetch All"}
        </button>
      </div>

      {usdcBalance && (
        <pre className="result-success">USDC Balance (raw): {usdcBalance}</pre>
      )}

      {priceConfig && (
        <pre className="result-success">
          Price Config:{"\n"}{JSON.stringify(priceConfig, null, 2)}
        </pre>
      )}

      {balances && (
        <pre className="result-success">
          Balances:{"\n"}{JSON.stringify(balances, null, 2)}
        </pre>
      )}

      {txLimits && (
        <pre className="result-success">
          Tx Limits:{"\n"}{JSON.stringify(txLimits, null, 2)}
        </pre>
      )}

      {error && <pre className="result-error">{error}</pre>}
    </div>
  );
};
