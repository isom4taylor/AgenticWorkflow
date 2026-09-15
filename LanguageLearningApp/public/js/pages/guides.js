// Guides: a table of contents plus a slide viewer for each lesson.

import { showPanel, backLink } from '../panels.js';
import { learningLangCode } from '../state.js';
import { escapeHtml, toast } from '../ui.js';
import { canSpeak, speak, stopSpeaking } from '../speech.js';
import { LESSONS, findLesson } from '../guidesContent.js';
import { isSpanish } from '../conjugation.js';

// ------------------------------------------------------- table of contents

export function renderGuides() {
  const panel = showPanel('page-guides');
  panel.innerHTML = `
    ${backLink('/', 'Home')}
    <header class="page-header">
      <h1>📖 Guides</h1>
      <p class="muted">Slide-based lessons. Pick a topic from the contents below.</p>
    </header>
    ${!isSpanish(learningLangCode())
      ? `<p class="notice">These lessons cover <strong>Spanish</strong> grammar and spelling specifically.</p>`
      : ''}
    <nav class="card toc">
      <h2>Table of contents</h2>
      <ol class="toc-list">
        ${LESSONS.map(
          (lesson) => `
          <li>
            <a class="toc-entry" href="#/guides/${lesson.id}">
              <span class="toc-icon">${lesson.icon}</span>
              <span class="toc-text">
                <span class="toc-title">${escapeHtml(lesson.title)}</span>
                <span class="toc-summary">${escapeHtml(lesson.summary)}</span>
              </span>
              <span class="toc-count">${lesson.slides.length} slides</span>
            </a>
          </li>`
        ).join('')}
      </ol>
    </nav>
  `;
}

// ------------------------------------------------------------ slide viewer

export function renderGuideLesson(lessonId) {
  const panel = showPanel('page-guides');
  const lesson = findLesson(lessonId);
  if (!lesson) {
    panel.innerHTML = `${backLink('/guides', 'Guides')}<p class="muted">That lesson doesn't exist.</p>`;
    return undefined;
  }

  let index = 0;
  const langCode = learningLangCode();

  function slideHtml(slide) {
    const parts = [];
    if (slide.image) {
      parts.push(`
        <figure class="slide-figure">
          <img src="${escapeHtml(slide.image.src)}" alt="${escapeHtml(slide.image.alt || '')}" />
          ${slide.image.caption ? `<figcaption>${escapeHtml(slide.image.caption)}</figcaption>` : ''}
        </figure>`);
    }
    (slide.body || []).forEach((paragraph) => {
      parts.push(`<p>${escapeHtml(paragraph)}</p>`);
    });
    if (slide.bullets) {
      parts.push(`<ul class="slide-bullets">
        ${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
      </ul>`);
    }
    if (slide.table) {
      parts.push(`
        <div class="slide-table-wrap">
          <table class="slide-table">
            ${slide.table.caption ? `<caption>${escapeHtml(slide.table.caption)}</caption>` : ''}
            <thead>
              <tr>${slide.table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${slide.table.rows
                .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
                .join('')}
            </tbody>
          </table>
        </div>`);
    }
    if (slide.note) {
      parts.push(`<p class="slide-note">💡 ${escapeHtml(slide.note)}</p>`);
    }
    return parts.join('');
  }

  // Collects the Spanish examples on a slide so the whole slide can be read
  // aloud in one go.
  function speakableText(slide) {
    const lines = [...(slide.bullets || [])];
    if (slide.table) slide.table.rows.forEach((row) => lines.push(row.join(', ')));
    return lines.join('. ');
  }

  function draw() {
    const slide = lesson.slides[index];
    panel.innerHTML = `
      ${backLink('/guides', 'Guides')}
      <header class="page-header">
        <h1>${lesson.icon} ${escapeHtml(lesson.title)}</h1>
      </header>

      <article class="card slide">
        <div class="slide-progress">
          <span class="muted">Slide ${index + 1} of ${lesson.slides.length}</span>
          <div class="slide-dots">
            ${lesson.slides
              .map((_, i) => `<button class="slide-dot ${i === index ? 'active' : ''}" data-slide="${i}" title="Slide ${i + 1}" aria-label="Go to slide ${i + 1}"></button>`)
              .join('')}
          </div>
        </div>

        <h2 class="slide-title">${escapeHtml(slide.title)}</h2>
        <div class="slide-content">${slideHtml(slide)}</div>

        <div class="slide-nav">
          <button id="slide-prev" class="btn btn-ghost" ${index === 0 ? 'disabled' : ''}>← Previous</button>
          ${canSpeak() && speakableText(slide) ? '<button id="slide-read" class="btn btn-ghost btn-small">🔊 Read the examples</button>' : ''}
          <button id="slide-next" class="btn btn-ghost" ${index === lesson.slides.length - 1 ? 'disabled' : ''}>Next →</button>
        </div>
      </article>

      ${index === lesson.slides.length - 1
        ? `<p class="switch-link"><a href="#/guides">← Back to the table of contents</a></p>`
        : ''}
    `;

    panel.querySelector('#slide-prev').onclick = () => go(-1);
    panel.querySelector('#slide-next').onclick = () => go(1);
    panel.querySelectorAll('.slide-dot').forEach((dot) => {
      dot.onclick = () => {
        stopSpeaking();
        index = Number(dot.getAttribute('data-slide'));
        draw();
      };
    });
    const readBtn = panel.querySelector('#slide-read');
    if (readBtn) {
      readBtn.onclick = () => {
        stopSpeaking();
        speak(speakableText(slide), { lang: langCode, rate: 0.85 }).catch((err) => toast(err.message, 'error'));
      };
    }
  }

  function go(delta) {
    const next = index + delta;
    if (next < 0 || next >= lesson.slides.length) return;
    stopSpeaking();
    index = next;
    draw();
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  };
  window.addEventListener('keydown', onKeyDown);

  draw();

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    stopSpeaking();
  };
}
