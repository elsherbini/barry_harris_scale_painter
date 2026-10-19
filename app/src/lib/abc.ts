/** Transform ABC so it renders on the diminished clef. Ported from reference_apps/diminished_staff. */
export function makeDimAbc(abc: string, bassOctave: 8 | 16 = 8): string {
	const bassClef = 'diminished-' + bassOctave;
	return abc
		.replace(/^(K:\s*\S+)/gm, '$1 clef=diminished')
		.replace(/\[K:([^\]]+)\]/g, '[K:$1 clef=diminished]')
		.replace(/^(V:\s*\S+\s+(?:clef=)?)bass/gm, '$1' + bassClef)
		.replace(/^(V:\s*\S+\s+(?:clef=)?)(treble|alto|tenor)/gm, '$1diminished')
		.replace(/\s+octave=-?\d+/g, '');
}

// Für Elise, from reference_apps/diminished_staff.
export const DEFAULT_ABC = `X:1
T:Für Elise
C:Ludwig van Beethoven
V:1
V:2 bass
M:3/8
L:1/16
Q:3/8=40
K:Am
V:1
B2 z EcB|A2 z2 z2|[E6G6_B6^c6]|[F4A4d4][^ce][df]|[^G4d4f4][G2d2f2]|[A6c6e6]|
V:2
E,,E,^G, z z2|A,,A,,A,,A,,A,,A,,|A,,A,,A,,A,,A,,A,,|A,,A,,A,,A,,A,,A,,|A,,A,,A,,A,,A,,A,,|A,,A,,A,,A,,A,,A,,|
%
V:1
[F4d4][Ec][DB]|[C4^F4A4][C2A2][C2A2][E2c2][D2B2]|[C6A6]|[E6G6_B6^c6]|[F4A4d4][^ce][df]|
V:2
[D,,A,,][D,,A,,][D,,A,,][D,,A,,][D,,A,,][D,,A,,]|[^D,,A,,][D,,A,,][D,,A,,][D,,A,,][D,,A,,][D,,A,,]|[E,,A,,][E,,A,,][E,,A,,][E,,A,,][E,,^G,,][E,,G,,]|[A,,,A,,]A,,A,,A,,A,,A,,|A,,A,,A,,A,,A,,A,,|A,,A,,A,,A,,A,,A,,|
%
V:1
[d4f4][d2f2]|[d6f6]|[G4_e4][Fd][_Ec]|[D4F4_B4][D2F2A2]|[D4F4^G4][D2F2G2]|[C2E2A2] z2 z2|
V:2
A,,A,,A,,A,,A,,A,,|_B,,B,,B,,B,,B,,B,,|_B,,B,,B,,B,,B,,B,,|_B,,B,,B,,B,,B,,B,,|=B,,B,,B,,B,,B,,B,,|C,2 z2 z2|
%
V:1
[E2B2] z2 z2|(3A,CE (3Ace (3dcB|(3Ace (3ac'e' (3d'c'b|(3Ace (3ac'e' (3d'c'b|
V:2
[E,2^G,2] z2 z2|A,,,2 z2 [A,2C2E2]|[A,2C2E2] z2 [A,2C2E2]|[A,2C2E2] z2 [A,2C2E2]|
%
V:1
(3_ba_a (3g_gf (3e_ed|(3_d'c'b (3_ba_b (3g_gf|e^deB=dc|A2 z CEA|
V:2
[A,2C2E2] z2 z2|z6|z6|A,,E,A, z z2|
%
V:1
B2 z E^GB|c2 z Ee^d|e^deB=dc|!>(!A2 z CEA|B2 z EcB|[c,a,]12!>)!|
V:2
E,,E,^G, z z2|A,,E,A, z z2|z6|A,,E,A, z z2|E,,E,^G, z z2|[A,,A,E,]12|`;
