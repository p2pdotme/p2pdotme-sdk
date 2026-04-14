import { useState } from "react";
import { cipherParse, decryptPaymentAddress, encryptPaymentAddress } from "@p2pdotme/sdk/payload";
import { CustomInput } from "../../atoms";

export const EncryptDecryptTab = ({
  onResult,
  onError,
}: {
  onResult: (value: string) => void;
  onError: (value: string) => void;
}) => {
  const [encryptInput, setEncryptInput] = useState("");
  const [encryptPubKey, setEncryptPubKey] = useState("");
  const [decryptInput, setDecryptInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEncrypt() {
    setLoading(true);

    const res = await encryptPaymentAddress(encryptInput, encryptPubKey);

    res.match(
      (data) => onResult(data),
      (err) => onError(`[${err.code}] ${err.message}`),
    );

    setLoading(false);
  }

  async function handleDecrypt() {
    setLoading(true);

    try {
      const encryptedObject = cipherParse(decryptInput);
      const jsonString = JSON.stringify(encryptedObject);

      const res = await decryptPaymentAddress(jsonString);

      res.match(
        (data) => onResult(data),
        (err) => onError(`[${err.code}] ${err.message}`),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      onError(`Cipher parse error: ${msg}`);
    }

    setLoading(false);
  }

  return (
    <fieldset>
      <legend>Encrypt / Decrypt</legend>
      <CustomInput label="Payment Address to Encrypt" value={encryptInput} onChange={setEncryptInput} placeholder="upi@..." />
      <CustomInput label="Recipient Public Key" value={encryptPubKey} onChange={setEncryptPubKey} placeholder="0x..." />
      <button type="button" className="btn-primary" onClick={handleEncrypt} disabled={loading}>
        {loading ? "Loading..." : "Encrypt"}
      </button>

      <div style={{ marginTop: "12px" }}>
        <CustomInput label="Encrypted Data (hex)" value={decryptInput} onChange={setDecryptInput} placeholder="Paste encrypt output here" />
        <button type="button" className="btn-primary" onClick={handleDecrypt} disabled={loading}>
          {loading ? "Loading..." : "Decrypt"}
        </button>
      </div>
    </fieldset>
  );
};
