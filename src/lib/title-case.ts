const minorWords = new Set([
  "a",
  "an",
  "the",
  "and",
  "but",
  "or",
  "nor",
  "for",
  "so",
  "yet",
  "as",
  "at",
  "by",
  "in",
  "of",
  "on",
  "to",
  "via",
  "with",
  "from",
  "into",
  "onto",
  "over",
  "per",
  "than",
  "vs",
  "versus",
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "among",
  "around",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "between",
  "beyond",
  "during",
  "inside",
  "near",
  "outside",
  "past",
  "since",
  "through",
  "throughout",
  "toward",
  "towards",
  "under",
  "until",
  "upon",
  "within",
  "without",
  "dan",
  "atau",
  "di",
  "ke",
  "dari",
  "dengan",
  "untuk",
  "yang",
]);
const acronyms = new Set(["PGN", "FEN", "ECO", "API", "LLM", "UI", "CC0"]);
const words = /[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu;

export function titleWords(text: string) {
  const matches = [...text.matchAll(words)];
  return new Map(
    matches.map((match, index) => {
      const word = match[0];
      const lower = word.toLocaleLowerCase();
      const previousEnd = index
        ? matches[index - 1].index! + matches[index - 1][0].length
        : 0;
      const afterColon = /:\s*$/.test(text.slice(previousEnd, match.index));
      const boundary =
        index === 0 || index === matches.length - 1 || afterColon;
      const value =
        !boundary && minorWords.has(lower)
          ? lower
          : acronyms.has(word) || /^[a-h][1-8]$/.test(word)
            ? word
            : word[0].toLocaleUpperCase() +
              (word === word.toLocaleUpperCase()
                ? word.slice(1).toLocaleLowerCase()
                : word.slice(1));
      return [match.index!, value];
    }),
  );
}

export function titleCase(text: string) {
  const replacements = titleWords(text);
  return text.replace(words, (word, index) => replacements.get(index) || word);
}

export function replaceTitleSegment(
  text: string,
  offset: number,
  replacements: Map<number, string>,
) {
  return text.replace(
    words,
    (word, index) => replacements.get(offset + index) || word,
  );
}
