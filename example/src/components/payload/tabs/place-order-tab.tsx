import { useState } from "react";
import type { Address } from "viem";
import { usePayloadGenerator } from "@p2pdotme/sdk/react";
import { CURRENCIES } from "../../../constants";
import type { Currency } from "../../../types";
import { CustomInput } from "../../atoms";

export const PlaceOrderTab = ({
  onResult,
  onError,
}: {
  onResult: (value: string) => void;
  onError: (value: string) => void;
}) => {
  const [amount, setAmount] = useState("10000000");
  const [recipientAddr, setRecipientAddr] = useState("");
  const [orderType, setOrderType] = useState("0");
  const [currency, setCurrency] = useState<Currency>(CURRENCIES.INR);
  const [fiatAmount, setFiatAmount] = useState("850000000");
  const [userAddress, setUserAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const payload = usePayloadGenerator();

  async function handlePlaceOrder() {
    setLoading(true);

    const res = await payload.placeOrder({
      amount: BigInt(amount),
      recipientAddr: recipientAddr as Address,
      orderType: Number(orderType),
      currency,
      fiatAmount: BigInt(fiatAmount),
      user: userAddress as Address,
    });

    res.match(
      (data) => onResult(JSON.stringify(data, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2)),
      (err) => onError(`[${err.code}] ${err.message}`),
    );

    setLoading(false);
  }

  return (
    <fieldset>
      <legend>Place Order</legend>
      <CustomInput label="Amount (raw)" value={amount} onChange={setAmount} placeholder="e.g. 10000000" />
      <CustomInput label="Recipient Address" value={recipientAddr} onChange={setRecipientAddr} placeholder="0x..." />
      <div className="field">
        <label>Order Type</label>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
          <option value="0">Buy (0)</option>
          <option value="1">Sell (1)</option>
          <option value="2">Pay (2)</option>
        </select>
      </div>
      <div className="field">
        <label>Currency</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
          {Object.values(CURRENCIES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <CustomInput label="Fiat Amount (raw)" value={fiatAmount} onChange={setFiatAmount} placeholder="e.g. 850000000" />
      <CustomInput label="User Address" value={userAddress} onChange={setUserAddress} placeholder="0x..." />
      <button type="button" className="btn-primary" onClick={handlePlaceOrder} disabled={loading}>
        {loading ? "Loading..." : "Place Order"}
      </button>
    </fieldset>
  );
};
