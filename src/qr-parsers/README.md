# @p2pdotme/sdk/qr-parsers

QR code parsers for P2P.me payment networks. Extracts payment addresses and amounts from QR codes across multiple currencies.

## Supported Currencies

| Currency | Country     | Payment Network | Format          |
| -------- | ----------- | --------------- | --------------- |
| INR      | India       | UPI             | URL scheme      |
| IDR      | Indonesia   | QRIS            | EMVCo TLV       |
| BRL      | Brazil      | PIX             | EMVCo TLV + CRC |
| ARS      | Argentina   | MercadoPago     | EMVCo TLV + CRC |
| VEN      | Venezuela   | Pago Movil      | Base64 payload  |

## Installation

```bash
bun add @p2pdotme/sdk
```

## Usage

```ts
import { parseQR } from "@p2pdotme/sdk/qr-parsers";

const result = await parseQR({
  qrData: "upi://pay?pa=merchant@upi&am=500&pn=Store",
  currency: "INR",
  sellPrice: 85, // 1 USDC = 85 INR
});

if (result.isOk()) {
  console.log(result.value.paymentAddress); // "merchant@upi"
  console.log(result.value.amount);         // { usdc: 5.88, fiat: 500 }
} else {
  console.error(result.error.code);    // "INVALID_QR" | "INVALID_CURRENCY" | "INVALID_AMOUNT" | "FETCH_FAILED"
  console.error(result.error.message);
}
```

### PIX (BRL) — Dynamic QR codes

PIX QR codes can contain a URL that points to dynamic payment data. To resolve these, pass `proxyUrl` (and optionally `orderId` for tracking):

```ts
const result = await parseQR({
  qrData,
  currency: "BRL",
  sellPrice: 5.5,
  proxyUrl: "https://pix-proxy.example.com",
  orderId: "order-123",
});
```

The proxy receives `GET /pix?locationUrl=<url>&orderId=<id>` and should return the raw PIX response (JWT).

## API

### `parseQR(params)`

Takes a single `ParseQRParams` object:

| Field       | Type                | Description                                 |
| ----------- | ------------------- | ------------------------------------------- |
| `qrData`    | `string`            | Raw QR code content                         |
| `currency`  | `SupportedCurrency` | `"INR" \| "IDR" \| "BRL" \| "ARS" \| "VEN"` |
| `sellPrice` | `number`            | Exchange rate: 1 USDC = X fiat              |
| `proxyUrl?` | `string`            | Only for dynamic PIX (BRL)                  |
| `orderId?`  | `string`            | Forwarded to the PIX proxy for tracking     |

**Returns** `Promise<Result<ParsedQR, QRParserError>>` ([neverthrow](https://github.com/supermacro/neverthrow))

### Types

```ts
interface ParseQRParams {
  qrData: string;
  currency: SupportedCurrency;
  sellPrice: number;
  proxyUrl?: string;
  orderId?: string;
}

interface ParsedQR {
  paymentAddress: string;
  amount?: { usdc: number; fiat: number };
}

type QRParserErrorCode =
  | "INVALID_QR"
  | "INVALID_CURRENCY"
  | "INVALID_AMOUNT"
  | "FETCH_FAILED";
```

## Example

See [`example/`](../../example/) for standalone scripts. The QR parser isn't
exercised directly in the current example set — use it inline wherever your
app needs to turn a scanned QR into a `paymentAddress` + `amount`, then feed
the address into [`orders.setSellOrderUpi`](../orders/README.md#orderssellsellorderupi).
