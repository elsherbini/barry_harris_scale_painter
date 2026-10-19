export type Box = { x: number; y: number; width: number; height: number };

export function intersects(a: Box, b: Box): boolean {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * Finds the first y (moving upward in `step` increments from `box.y`) at which `box`
 * overlaps none of `obstacles`. Returns the shifted box.
 */
export function placeAbove(box: Box, obstacles: Box[], step: number, maxTries = 20): Box {
	let y = box.y;
	for (let i = 0; i < maxTries; i++) {
		const candidate = { ...box, y };
		if (!obstacles.some(o => intersects(candidate, o))) return candidate;
		y -= step;
	}
	return { ...box, y };
}
