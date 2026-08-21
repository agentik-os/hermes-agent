const KEY_MAP: Readonly<Record<string, string>> = {
  '\r': 'Enter',
  '\u007f': 'BSpace',
  '\t': 'Tab',
  '\u001b': 'Escape',
  '\u001b[A': 'Up',
  '\u001b[B': 'Down',
  '\u001b[C': 'Right',
  '\u001b[D': 'Left',
  '\u0003': 'C-c',
  '\u0004': 'C-d',
  '\u001a': 'C-z'
}

export type MuxInput = { key: string } | { text: string }

export function muxInputForXtermData(data: string): MuxInput {
  return KEY_MAP[data] ? { key: KEY_MAP[data] } : { text: data }
}
