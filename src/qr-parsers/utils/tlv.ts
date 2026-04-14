/**
 * Parse a TLV (Tag-Length-Value) encoded string.
 * Tags are 2 digits, lengths are 2 digits (EMVCo standard).
 * Returns all parsed tag-value pairs. Stops gracefully on truncated data.
 */
export function parseTLV(data: string): { tag: string; value: string }[] {
	const entries: { tag: string; value: string }[] = [];
	let pos = 0;

	while (pos + 4 <= data.length) {
		const tag = data.substring(pos, pos + 2);
		const lengthStr = data.substring(pos + 2, pos + 4);

		if (!/^[0-9]{2}$/.test(tag) || !/^[0-9]{2}$/.test(lengthStr)) {
			break;
		}

		const length = parseInt(lengthStr, 10);
		if (pos + 4 + length > data.length) {
			break;
		}

		const value = data.substring(pos + 4, pos + 4 + length);
		entries.push({ tag, value });
		pos += 4 + length;
	}

	return entries;
}

/**
 * Extract specific tags from a TLV string.
 * Returns a record mapping tag IDs to their values.
 * Only includes tags present in the `tags` array.
 */
export function extractTags(data: string, tags: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	const tagSet = new Set(tags);

	for (const entry of parseTLV(data)) {
		if (tagSet.has(entry.tag)) {
			result[entry.tag] = entry.value;
		}
	}

	return result;
}
