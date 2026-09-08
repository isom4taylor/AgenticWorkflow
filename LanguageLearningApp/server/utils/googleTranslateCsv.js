// Parses a CSV export of a Google Translate "starred/saved translations"
// list into an array of { baseText, baseLanguage, learningText, learningLanguage }.
//
// The export has NO header row. Each row has 4 columns that mean:
//   Language1, Language2, WordInLanguage1, WordInLanguage2
// e.g.  en,es,hello,hola
//   or  es,en,hola,hello
//
// Language1/Language2 can be either short codes ("en") or full names
// ("English") depending on the export. Since either language can appear in
// either position, we detect which column is the user's base language (e.g.
// "English") and place that word in `baseText`; the other word/language
// becomes `learningText`/`learningLanguage`.

const parse = require('csv-parse/lib/sync');
const { toDisplayName, matchesLanguage } = require('./languageCodes');

function stripBom(buffer) {
  // Some spreadsheet tools (e.g. Excel) save CSVs with a leading UTF-8 BOM,
  // which would otherwise be parsed as part of the first field.
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.slice(3);
  }
  return buffer;
}

// Parses a Google Translate starred-list CSV.
// `baseLanguage` is the user's configured base language (e.g. "English");
// used to figure out which column of each row holds the base-language word.
function parseGoogleTranslateCsv(rawBuffer, baseLanguage) {
  const buffer = stripBom(rawBuffer);
  const rows = parse(buffer, {
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  if (rows.length === 0) return [];

  const pairs = [];
  rows.forEach((row) => {
    if (!row || row.length === 0) return;

    if (row.length >= 4) {
      const [lang1, lang2, word1, word2] = row;
      let baseText;
      let baseLangName;
      let learningText;
      let learningLangName;

      if (matchesLanguage(lang1, baseLanguage)) {
        baseText = word1;
        baseLangName = toDisplayName(lang1);
        learningText = word2;
        learningLangName = toDisplayName(lang2);
      } else if (matchesLanguage(lang2, baseLanguage)) {
        baseText = word2;
        baseLangName = toDisplayName(lang2);
        learningText = word1;
        learningLangName = toDisplayName(lang1);
      } else {
        // Neither column matched the user's base language (e.g. base
        // language changed after export, or an unrecognized code). Fall
        // back to treating the first column as the base language so no
        // data is silently dropped.
        baseText = word1;
        baseLangName = toDisplayName(lang1);
        learningText = word2;
        learningLangName = toDisplayName(lang2);
      }

      baseText = (baseText || '').trim();
      learningText = (learningText || '').trim();
      if (baseText || learningText) {
        pairs.push({ baseText, baseLanguage: baseLangName, learningText, learningLanguage: learningLangName });
      }
      return;
    }

    // Fallback for simpler 2-column CSVs: [baseText, learningText]
    if (row.length === 2) {
      const baseText = (row[0] || '').trim();
      const learningText = (row[1] || '').trim();
      if (baseText || learningText) pairs.push({ baseText, learningText, baseLanguage: null, learningLanguage: null });
    }
  });

  return pairs;
}

module.exports = { parseGoogleTranslateCsv };
