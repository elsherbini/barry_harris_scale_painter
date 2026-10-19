import { Chord, Note, Pcset } from 'tonal';

export type ScaleType = 'maj6' | 'min6' | 'dom7' | 'dom7b5' | 'octatonic';

export type BarryHarrisScale = {
  name: string;
  aliases: string[];
  type: ScaleType;
  root: string;
  chroma: string;
};

const ROOTS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const SCALE_TYPES: { type: ScaleType; chordSuffix: string; label: string }[] = [
  { type: 'maj6', chordSuffix: '6', label: 'Maj6 Diminished' },
  { type: 'min6', chordSuffix: 'm6', label: 'Min6 Diminished' },
  { type: 'dom7', chordSuffix: '7', label: 'Dom7 Diminished' },
  { type: 'dom7b5', chordSuffix: '7b5', label: 'Dom7b5 Diminished' },
  { type: 'octatonic', chordSuffix: 'dim7', label: 'Octatonic' },
];

function generateScales(): BarryHarrisScale[] {
  const scales: BarryHarrisScale[] = [];
  const seenChromas = new Set<string>();

  for (const st of SCALE_TYPES) {
    for (const root of ROOTS) {
      const chordNotes = Chord.get(root + st.chordSuffix).notes;
      const dimRoot = Note.transpose(root, '-2m');
      const dimNotes = Chord.get(dimRoot + 'dim7').notes;
      const chroma = Pcset.chroma([...chordNotes, ...dimNotes]);

      const key = st.type + ':' + chroma;
      if (seenChromas.has(key)) continue;
      seenChromas.add(key);

      scales.push({
        name: `${root} ${st.label}`,
        aliases: [],
        type: st.type,
        root,
        chroma,
      });
    }
  }

  return scales;
}

export const ALL_SCALES = generateScales();
