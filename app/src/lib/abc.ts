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

export const DEFAULT_ABC = `X:1
T:Example
L:1/8
M:4/4
Q:1/4=120
K:C
C D E F G A B c | d c B A G F E D | G A B c d e f g | c2 z2 z4 |
F _A c d _A F c d | e d c B A G F E | G ^G A _B =B c ^c d | [c e g]4 z4 |`;
