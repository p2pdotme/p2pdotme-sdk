import { useState } from "react";
import { usePayloadGenerator } from "@p2pdotme/sdk/react";
import { CustomInput } from "../../atoms";

export const SellOrderUpiTab = ({
  onResult,
  onError,
}: {
  onResult: (value: string) => void;
  onError: (value: string) => void;
}) => {
  const [orderId, setOrderId] = useState("0");
  const [paymentAddress, setPaymentAddress] = useState("");
  const [encPubKey, setEncPubKey] = useState("");
  const [updatedAmount, setUpdatedAmount] = useState("10000000");
  const [loading, setLoading] = useState(false);

  const payload = usePayloadGenerator();

  async function handleSetSellOrderUpi() {
    setLoading(true);

    const res = await payload.setSellOrderUpi({
      orderId: Number(orderId),
      paymentAddress,
      merchantPublicKey: encPubKey,
      updatedAmount: BigInt(updatedAmount),
    });

    res.match(
      (data) => onResult(JSON.stringify(data, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2)),
      (err) => onError(`[${err.code}] ${err.message}`),
    );

    setLoading(false);
  }

  return (
    <fieldset>
      <legend>Set Sell Order UPI</legend>
      <CustomInput label="Order ID" value={orderId} onChange={setOrderId} placeholder="e.g. 0" />
      <CustomInput label="Payment Address" value={paymentAddress} onChange={setPaymentAddress} placeholder="upi@..." />
      <CustomInput label="Encryption Public Key" value={encPubKey} onChange={setEncPubKey} placeholder="0x..." />
      <CustomInput label="Updated Amount (raw)" value={updatedAmount} onChange={setUpdatedAmount} placeholder="e.g. 10000000" />
      <button type="button" className="btn-primary" onClick={handleSetSellOrderUpi} disabled={loading}>
        {loading ? "Loading..." : "Set Sell Order UPI"}
      </button>
    </fieldset>
  );
};
