# @p2pdotme/sdk/payload

Order payload generation for P2P.me. Composes circle selection, relay identity management, and ECIES encryption into ready-to-submit on-chain payloads.

## What it does

- Validates order parameters, selects an eligible circle via the order router, resolves a relay identity, and assembles the final `PlaceOrderPayload` for on-chain submission.
- Encrypts seller payment addresses (UPI, PIX, etc.) with the merchant's public key using ECIES (secp256k1 + AES-256-CBC).
- Manages relay identity keypairs in localStorage — creates on first use, persists across sessions.

## Usage

### React (recommended)

```tsx
import { SdkProvider, usePayloadGenerator } from "@p2pdotme/sdk/react";
import { parseUnits } from "viem";

function App() {
  return (
    <SdkProvider
      publicClient={publicClient}
      subgraphUrl={SUBGRAPH_URL}
      diamondAddress={DIAMOND_ADDRESS}
      usdcAddress={USDC_ADDRESS}
    >
      <OrderForm />
    </SdkProvider>
  );
}

function OrderForm() {
  const payload = usePayloadGenerator();

  async function handleBuy() {
    const result = await payload.placeOrder({
      amount: parseUnits("10", 6),
      recipientAddr: "0xRecipient",
      orderType: 0, // BUY
      currency: "INR",
      fiatAmount: parseUnits("850", 6),
      user: "0xUserAddress",
    });

    result.match(
      (data) => submitOnChain(data),
      (error) => console.error(`[${error.code}] ${error.message}`),
    );
  }
}
```

### Encrypt / Decrypt Payment Addresses

```ts
import {
  encryptPaymentAddress,
  decryptPaymentAddress,
  cipherParse,
  createRelayIdentity,
} from "@p2pdotme/sdk/payload";

// Encrypt a UPI address with the merchant's public key
const encrypted = await encryptPaymentAddress("user@upi", merchantPublicKey);
// encrypted.value is a hex string (IV + compressed ephemPubKey + MAC + ciphertext)

// Decrypt (merchant side) — parse the hex, then decrypt with JSON envelope
const encryptedObj = cipherParse(encrypted._unsafeUnwrap());
const decrypted = await decryptPaymentAddress(JSON.stringify(encryptedObj));
const { message, signature } = JSON.parse(decrypted._unsafeUnwrap());
```

## API

### `createPayloadGenerator(config)`

| Config | Type | Description |
|--------|------|-------------|
| `orderRouter` | `OrderRouter` | Shared order router instance (reused, not re-created per call) |

### `generator.placeOrder(params)`

Returns `ResultAsync<PlaceOrderPayload, PayloadError>`.

| Param | Type | Description |
|-------|------|-------------|
| `amount` | `bigint` | USDC amount (6 decimals) |
| `recipientAddr` | `Address` | Recipient wallet address |
| `orderType` | `number` | `0` = BUY, `1` = SELL, `2` = PAY |
| `currency` | `string` | Currency code (e.g. `"INR"`) |
| `fiatAmount` | `bigint` | Fiat amount (6 decimals) |
| `user` | `Address` | User's wallet address |
| `pubKey` | `string?` | Optional custom public key (defaults to relay identity) |
| `preferredPaymentChannelConfigId` | `bigint?` | Optional payment channel config ID |
| `fiatAmountLimit` | `bigint?` | Optional fiat amount limit (defaults to `0n`) |

### `generator.setSellOrderUpi(params)`

Returns `ResultAsync<SetSellOrderUpiPayload, PayloadError>`. Encrypts the seller's payment address with the merchant's public key.

| Param | Type | Description |
|-------|------|-------------|
| `orderId` | `number` | On-chain order ID |
| `paymentAddress` | `string` | Seller's payment address (e.g. UPI VPA) |
| `merchantPublicKey` | `string` | Merchant's public key (128 hex chars, no 0x04 prefix) |
| `updatedAmount` | `bigint` | Updated amount for the order |

### `encryptPaymentAddress(address, publicKey)`

Signs and encrypts a payment address using the relay identity's private key and the recipient's public key. Returns `ResultAsync<string, PayloadError>` — the hex-encoded ECIES ciphertext.

### `decryptPaymentAddress(encryptedJson)`

Decrypts an encrypted payment address using the relay identity's private key. Expects a JSON string with `{ iv, ephemPublicKey, ciphertext, mac }` fields.

### `cipherParse(hex)` / `cipherStringify(encrypted)`

Convert between compact hex wire format and the `Encrypted` object. Use `cipherParse` to decode output from `encryptPaymentAddress` before passing to `decryptPaymentAddress`.

### `createRelayIdentity()` / `getRelayIdentity()`

Manage the browser-local relay keypair stored in localStorage. `getRelayIdentity` returns the existing identity or creates a new one if absent/invalid.

## Errors

All async methods return `ResultAsync<T, PayloadError>` — no thrown exceptions.

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed (Zod) |
| `CIRCLE_SELECTION_ERROR` | Circle selection via order router failed |
| `ENCRYPTION_ERROR` | ECIES encryption or signing failed |
| `DECRYPTION_ERROR` | ECIES decryption or JSON parse failed |
