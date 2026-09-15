/** Normalize spelling presentation without deleting any instruction words. */
export function normalizeInstruction(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Fast feedback for capabilities absent from the retained pixel runtime. */
export function unsupportedInstructionReason(instructions: readonly string[]): string | null {
  const unsupported = instructions.some(text => {
    const normalized = normalizeInstruction(text);
    return /\b(?:audio|music|musical|sounds?|soundtracks?|songs?|rhythms?|rhythmic|mute|muting|unmute|unmuting|bpm)\b/.test(normalized)
      || /\b(?:tap\s*tap(?:\s*revenge)?|dance\s*dance(?:\s*(?:revolution|revlution))?|ddr)\b/.test(normalized);
  });
  return unsupported
    ? 'Audio and rhythm games, including Tap Tap Revenge and Dance Dance Revolution, are not supported yet. Rewrite your card using movement, food, enemies, shooting, wrapping or scoring. No AI request was made.'
    : null;
}
