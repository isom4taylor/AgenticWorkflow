// Wikipedia lookups for the "Teach Me Something" page.
//
// Requests are proxied through the server (rather than called from the
// browser) so we can resolve the user's learning language to a wiki
// subdomain, follow English -> learning-language article links for the
// "Random" button, and keep a single well-behaved User-Agent.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { httpsGetJson } = require('../utils/httpJson');
const { toLangCode } = require('../utils/languageCodes');

const router = express.Router();
router.use(requireAuth);

// Curated starting points for the "Random" button, so a random pick always
// lands on a concrete, vocabulary-rich everyday article instead of an
// obscure stub. Titles are English; they're mapped to the learning
// language's article via Wikipedia's langlinks.
const RANDOM_TOPICS = {
  food: ['Bread', 'Cheese', 'Rice', 'Apple', 'Tomato', 'Chocolate', 'Soup', 'Pasta', 'Honey', 'Potato'],
  beverages: ['Coffee', 'Tea', 'Milk', 'Orange juice', 'Wine', 'Beer', 'Lemonade', 'Hot chocolate'],
  animals: ['Dog', 'Cat', 'Horse', 'Elephant', 'Dolphin', 'Eagle', 'Butterfly', 'Bee', 'Wolf', 'Rabbit'],
  plants: ['Rose', 'Oak', 'Sunflower', 'Cactus', 'Bamboo', 'Fern', 'Tulip', 'Olive'],
  furniture: ['Chair', 'Table', 'Bed', 'Couch', 'Bookcase', 'Desk', 'Wardrobe', 'Lamp'],
  clothing: ['Shirt', 'Trousers', 'Shoe', 'Hat', 'Sock', 'Coat', 'Dress', 'Scarf'],
  'household items': ['Spoon', 'Fork', 'Knife', 'Plate', 'Cup', 'Broom', 'Towel', 'Mirror', 'Clock', 'Soap'],
  hobbies: ['Painting', 'Photography', 'Gardening', 'Chess', 'Knitting', 'Cooking', 'Reading', 'Fishing'],
  activities: ['Swimming', 'Running', 'Dance', 'Hiking', 'Cycling', 'Yoga', 'Skiing', 'Association football'],
};

const CATEGORIES = Object.keys(RANDOM_TOPICS);

function wikiHost(langCode) {
  return `${langCode || 'en'}.wikipedia.org`;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Plain-text intro extract for an exact article title.
async function fetchExtract(langCode, title) {
  const qs = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    redirects: '1',
    format: 'json',
    titles: title,
  });
  const data = await httpsGetJson(wikiHost(langCode), `/w/api.php?${qs.toString()}`);
  const pages = (data && data.query && data.query.pages) || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined || !page.extract) return null;
  return {
    title: page.title,
    extract: page.extract,
    url: `https://${wikiHost(langCode)}/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    language: langCode,
  };
}

// Best-matching article title for a free-text search.
async function searchTitle(langCode, query) {
  const qs = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: '1',
    namespace: '0',
    format: 'json',
  });
  const data = await httpsGetJson(wikiHost(langCode), `/w/api.php?${qs.toString()}`);
  // opensearch returns [query, [titles], [descriptions], [urls]]
  const titles = Array.isArray(data) ? data[1] : null;
  return titles && titles.length ? titles[0] : null;
}

// Given an English title, find the equivalent article title in `langCode`.
async function resolveLangLink(enTitle, langCode) {
  if (!langCode || langCode === 'en') return enTitle;
  const qs = new URLSearchParams({
    action: 'query',
    prop: 'langlinks',
    lllang: langCode,
    lllimit: '1',
    redirects: '1',
    format: 'json',
    titles: enTitle,
  });
  const data = await httpsGetJson('en.wikipedia.org', `/w/api.php?${qs.toString()}`);
  const pages = (data && data.query && data.query.pages) || {};
  const page = Object.values(pages)[0];
  const link = page && page.langlinks && page.langlinks[0];
  return link ? link['*'] : null;
}

function learningCode(req) {
  return toLangCode((req.user.learning_languages || [])[0]) || 'es';
}

// GET /api/wiki/search?q=...
// Looks the topic up on the learning language's Wikipedia, falling back to
// a title search when the raw query isn't an exact article name.
router.get('/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.status(400).json({ error: 'A search term is required.' });
  const langCode = learningCode(req);

  try {
    let article = await fetchExtract(langCode, query);
    if (!article) {
      const title = await searchTitle(langCode, query);
      if (title) article = await fetchExtract(langCode, title);
    }
    if (!article) {
      return res.status(404).json({
        error: `No ${req.user.learning_languages[0]} Wikipedia article found for "${query}".`,
      });
    }
    res.json(article);
  } catch (err) {
    res.status(502).json({ error: `Wikipedia lookup failed: ${err.message}` });
  }
});

// GET /api/wiki/random[?category=food]
// Picks a random topic from a random (or given) category and returns it in
// the learning language, falling back to the English article when that
// language has no equivalent page.
router.get('/random', async (req, res) => {
  const requested = String(req.query.category || '').trim().toLowerCase();
  const category = RANDOM_TOPICS[requested] ? requested : pickRandom(CATEGORIES);
  const enTitle = pickRandom(RANDOM_TOPICS[category]);
  const langCode = learningCode(req);

  try {
    let article = null;
    const localizedTitle = await resolveLangLink(enTitle, langCode);
    if (localizedTitle) article = await fetchExtract(langCode, localizedTitle);
    // No article in the learning language - show the English one rather
    // than failing the whole request.
    let fellBackToEnglish = false;
    if (!article) {
      article = await fetchExtract('en', enTitle);
      fellBackToEnglish = Boolean(article);
    }
    if (!article) return res.status(502).json({ error: 'Could not load a random topic. Try again.' });
    res.json({ ...article, category, fellBackToEnglish });
  } catch (err) {
    res.status(502).json({ error: `Wikipedia lookup failed: ${err.message}` });
  }
});

// GET /api/wiki/categories -> the category list backing the Random button
router.get('/categories', (req, res) => {
  res.json({ categories: CATEGORIES });
});

module.exports = router;
