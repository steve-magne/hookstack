import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildZip } from "@/lib/zip";

function readU32(bytes: Uint8Array, offset: number): number {
	return (
		(bytes[offset] |
			(bytes[offset + 1] << 8) |
			(bytes[offset + 2] << 16) |
			(bytes[offset + 3] << 24)) >>>
		0
	);
}

describe("buildZip", () => {
	it("emits a local file header per entry with the right signature and content length", () => {
		const zip = buildZip({ "hello.txt": "hi" });

		expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
		expect(readU32(zip, 18)).toBe(2); // compressed size = "hi".length
		expect(readU32(zip, 22)).toBe(2); // uncompressed size
	});

	it("computes a CRC32 matching Node's own zlib implementation", () => {
		const zip = buildZip({ "hello.txt": "hi" });

		expect(readU32(zip, 14)).toBe(crc32(Buffer.from("hi")));
	});

	it("writes one central directory + EOCD entry per file, with a matching count", () => {
		const zip = buildZip({ "a.txt": "a", "b.txt": "b" });

		const eocdSignature = [0x50, 0x4b, 0x05, 0x06];
		let eocdOffset = -1;
		for (let i = zip.length - 22; i >= 0; i--) {
			if (
				zip[i] === eocdSignature[0] &&
				zip[i + 1] === eocdSignature[1] &&
				zip[i + 2] === eocdSignature[2] &&
				zip[i + 3] === eocdSignature[3]
			) {
				eocdOffset = i;
				break;
			}
		}

		expect(eocdOffset).toBeGreaterThanOrEqual(0);
		const entryCount = zip[eocdOffset + 10] | (zip[eocdOffset + 11] << 8);
		expect(entryCount).toBe(2);
	});

	it("accepts raw bytes alongside strings without re-encoding them", () => {
		const raw = new Uint8Array([1, 2, 3, 4]);
		const zip = buildZip({ "raw.bin": raw });

		expect(readU32(zip, 18)).toBe(raw.length);
	});

	it("returns an empty archive (just the EOCD record) when given no files", () => {
		const zip = buildZip({});

		expect(zip.length).toBe(22);
		expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06]);
	});
});
