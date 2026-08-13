import { describe, expect, it } from "vitest";
import { calculateCRC16, verifyCRC16 } from "../../src/qr-parsers/utils/crc16";

describe("calculateCRC16", () => {
	// EMVCo spec reference payload (SGQR test vector).
	it("matches the EMVCo reference vector", () => {
		const payload =
			"00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304";
		expect(calculateCRC16(payload.replace(/6304$/, ""))).toBe("A13A");
	});

	it("zero-pads the checksum to 4 hex digits", () => {
		const crc = calculateCRC16("000201");
		expect(crc).toMatch(/^[0-9A-F]{4}$/);
	});
});

describe("verifyCRC16", () => {
	it("accepts a QR whose checksum matches", () => {
		const inner = "0002015802CN";
		const qr = `${inner}6304${calculateCRC16(inner)}`;
		expect(verifyCRC16(qr)).toEqual({ valid: true });
	});

	// Regression: when the computed CRC is literally "6304", the payload ends
	// "...63046304". Locating the tag with lastIndexOf("6304") matched the value
	// and falsely reported a misplaced tag. It must be located positionally.
	it("accepts a valid QR whose checksum is exactly 6304", () => {
		const inner = "000201041162";
		expect(calculateCRC16(inner)).toBe("6304");
		const qr = `${inner}6304${calculateCRC16(inner)}`; // "...63046304"
		expect(verifyCRC16(qr)).toEqual({ valid: true });
	});

	it("rejects a QR with a corrupted checksum", () => {
		const inner = "0002015802CN";
		const qr = `${inner}6304${calculateCRC16(inner)}`;
		const tampered = `${qr.slice(0, -1)}${qr.at(-1) === "0" ? "1" : "0"}`;
		const result = verifyCRC16(tampered);
		expect(result.valid).toBe(false);
		expect(result.error).toContain("CRC mismatch");
	});

	it("rejects a string too short to hold a CRC tag", () => {
		expect(verifyCRC16("6304").valid).toBe(false);
	});

	it("rejects when the final data object is not the CRC tag", () => {
		// Ends with a well-formed 8-char suffix, but the tag is "5904" not "6304".
		const result = verifyCRC16("00020159041234");
		expect(result.valid).toBe(false);
		expect(result.error).toContain("Missing or misplaced CRC tag");
	});

	it("rejects a non-hex CRC value", () => {
		const result = verifyCRC16("0002016304ZZZZ");
		expect(result.valid).toBe(false);
		expect(result.error).toContain("Invalid CRC hex format");
	});
});
