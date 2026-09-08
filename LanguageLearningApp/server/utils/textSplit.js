// Best-effort sentence splitter used by "advanced import" to break long
// starred phrases into smaller, more digestible flashcards. Alignment
// between base-language and learning-language sentences is naive (by index)
// since we have no translation/NLP engine available offline.

function splitIntoSentences(text) {
  if (!text) return [];
  const trimmed = String(text).trim();
  if (!trimmed) return [];
  // Split after ., !, ? or ; followed by a space or end of string, keeping
  // the punctuation with the preceding sentence.
  const parts = trimmed.match(/[^.!?;]+[.!?;]*/g) || [trimmed];
  return parts.map((p) => p.trim()).filter(Boolean);
}

// Pairs up base/learning sentence fragments by index. If one side has more
// fragments than the other, extra fragments on the shorter side are left
// blank so no content is silently dropped.
function pairSentences(baseText, learningText) {
  const baseSentences = splitIntoSentences(baseText);
  const learningSentences = splitIntoSentences(learningText);

  if (baseSentences.length <= 1 && learningSentences.length <= 1) {
    return [{ baseText: baseText || '', learningText: learningText || '' }];
  }

  const count = Math.max(baseSentences.length, learningSentences.length, 1);
  const pairs = [];
  for (let i = 0; i < count; i += 1) {
    pairs.push({
      baseText: baseSentences[i] || '',
      learningText: learningSentences[i] || '',
    });
  }
  return pairs.filter((p) => p.baseText || p.learningText);
}

module.exports = { splitIntoSentences, pairSentences };
