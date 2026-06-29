const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c;
	}
	return t;
})();

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const b of data) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ b) & 0xff];
	return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
	return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

function u32(n: number): Uint8Array {
	return new Uint8Array([
		n & 0xff,
		(n >> 8) & 0xff,
		(n >> 16) & 0xff,
		(n >> 24) & 0xff,
	]);
}

function join(parts: Uint8Array[]): Uint8Array {
	const len = parts.reduce((s, p) => s + p.length, 0);
	const out = new Uint8Array(len);
	let i = 0;
	for (const p of parts) {
		out.set(p, i);
		i += p.length;
	}
	return out;
}

export function buildZip(
	files: Record<string, string | Uint8Array>,
): Uint8Array {
	const enc = new TextEncoder();
	const entries: {
		name: Uint8Array;
		data: Uint8Array;
		crc: number;
		localOffset: number;
	}[] = [];
	const locals: Uint8Array[] = [];
	let localOffset = 0;

	for (const [path, content] of Object.entries(files)) {
		const name = enc.encode(path);
		const data = typeof content === "string" ? enc.encode(content) : content;
		const crc = crc32(data);

		const local = join([
			new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(data.length),
			u32(data.length),
			u16(name.length),
			u16(0),
			name,
			data,
		]);

		entries.push({ name, data, crc, localOffset });
		locals.push(local);
		localOffset += local.length;
	}

	const cdEntries = entries.map((e) =>
		join([
			new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
			u16(20),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(e.crc),
			u32(e.data.length),
			u32(e.data.length),
			u16(e.name.length),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(0),
			u32(e.localOffset),
			e.name,
		]),
	);

	const cd = join(cdEntries);
	const eocd = join([
		new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
		u16(0),
		u16(0),
		u16(entries.length),
		u16(entries.length),
		u32(cd.length),
		u32(localOffset),
		u16(0),
	]);

	return join([...locals, cd, eocd]);
}
