// npm run test:legal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LEGAL_PAGES, checkLegalPages, legalText } from './check-legal-pages.mjs';

const page = (body) => `<!DOCTYPE html><html><head><style>a[href]{}</style>
<script>const x = [1, 2];</script></head><body><nav>[menu]</nav>
<article class="legal" data-legal>${body}</article><footer>[pied]</footer></body></html>`;

function dist(bodies) {
  const dir = mkdtempSync(join(tmpdir(), 'legal-'));
  for (const [name, body] of Object.entries(bodies)) {
    mkdirSync(join(dir, name));
    writeFileSync(join(dir, name, 'index.html'), page(body));
  }
  return dir;
}

const complete = Object.fromEntries(LEGAL_PAGES.map((p) => [p, '<h1>Titre</h1><p>Texte <a href="/x">lien</a>.</p>']));

test('pages complètes : aucune erreur (crochets hors article ignorés)', () => {
  assert.deepEqual(checkLegalPages(dist(complete)), []);
});

test('un crochet dans une page fait échouer, avec le passage cité', () => {
  const errors = checkLegalPages(dist({ ...complete, cgv: '<p>Version 1.0 du [date de publication].</p>' }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^cgv : 1 passage/);
  assert.match(errors[0], /\[date de publication\]/);
});

test('un crochet encodé en entité HTML est aussi détecté', () => {
  const errors = checkLegalPages(dist({ ...complete, 'mentions-legales': '<p>Siège : &#91;adresse&#93;</p>' }));
  assert.equal(errors.length, 1);
});

test('une page absente fait échouer', () => {
  const { confidentialite, ...rest } = complete;
  const errors = checkLegalPages(dist(rest));
  assert.deepEqual(errors.map((e) => e.split(' : ')[0]), ['confidentialite']);
});

test('sans bloc <article data-legal>, échec plutôt que faux vert', () => {
  const dir = dist(complete);
  writeFileSync(join(dir, 'cgv', 'index.html'), '<html><body><p>Texte</p></body></html>');
  assert.match(checkLegalPages(dir)[0], /introuvable/);
});

test('legalText ignore balises et commentaires', () => {
  assert.equal(legalText(page('<!-- [note] --><p>a</p>')).trim(), 'a');
});
