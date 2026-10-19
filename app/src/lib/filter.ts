export function countKeyOverlap(keyChroma: string, scaleChroma: string): number {
	let count = 0;
	for (let i = 0; i < 12; i++) {
		if (keyChroma[i] === '1' && scaleChroma[i] === '1') count++;
	}
	return count;
}
