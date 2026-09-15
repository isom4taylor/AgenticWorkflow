// Homepage: the tile grid that leads into every other section.

import { showPanel } from '../panels.js';
import { learningLanguage, fluency } from '../state.js';
import { escapeHtml } from '../ui.js';

const SECTIONS = [
  { route: '/words-of-the-day', icon: '🗓️', title: 'Words of the Day', blurb: 'A noun, a verb and an adjective picked from your Learn list.' },
  { route: '/flash-cards', icon: '🃏', title: 'Flash Cards', blurb: 'Flip through your Learning list. Swipe, shuffle or sort.' },
  { route: '/practice', icon: '🏋️', title: 'Practice', blurb: 'Conjugation drills, speaking practice and listen-along vocabulary.' },
  { route: '/quizzes', icon: '❓', title: 'Quizzes', blurb: 'Listening dictation, the spoken numbers game, and sentence refreshers.' },
  { route: '/guides', icon: '📖', title: 'Guides', blurb: 'Lessons on grammar, pronouns, verb tenses, the alphabet and accents.' },
  { route: '/teach-me', icon: '💡', title: 'Teach Me Something', blurb: 'Read Wikipedia in your learning language and harvest new words.' },
];

export function renderHome() {
  const panel = showPanel('page-home');
  const language = escapeHtml(learningLanguage());

  panel.innerHTML = `
    <header class="home-header">
      <h1>Welcome back 👋</h1>
      <p class="muted">
        You're learning <strong>${language}</strong> at the
        <strong>${escapeHtml(fluency())}</strong> level. Pick somewhere to start.
      </p>
    </header>
    <div class="home-grid">
      ${SECTIONS.map(
        (section) => `
        <a class="home-tile" href="#${section.route}">
          <span class="home-tile-icon">${section.icon}</span>
          <span class="home-tile-title">${section.title}</span>
          <span class="home-tile-blurb">${section.blurb}</span>
        </a>`
      ).join('')}
    </div>
  `;
}
