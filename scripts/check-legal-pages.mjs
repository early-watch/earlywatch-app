// Contrôle de build des pages juridiques : échoue si une page publiée contient
// encore un crochet ouvrant « [ » (passage à compléter du projet de texte).
// Lancé par `npm run build` après `astro build` : un échec bloque le déploiement
// GitHub Pages (deploy.yml), donc aucune mise en ligne d'un texte incomplet.
//
// On contrôle le texte rendu dans <article data-legal> (pas le HTML brut, dont
// les scripts et styles peuvent contenir des crochets légitimes).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const LEGAL_PAGES = ['cgv', 'confidentialite', 'mentions-legales'];

export function legalText(html) {
  const m = html.match(/<article[^>]*\bdata-legal\b[^>]*>([\s\S]*?)<\/article>/);
  if (!m) return null;
  return m[1]
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#91;|&#x5b;|&lbrack;|&lsqb;/gi, '[')
    .replace(/\s+/g, ' ');
}

export function placeholders(text) {
  return [...text.matchAll(/\[[^\]]{0,80}\]?/g)].map((m) => m[0]);
}

export function checkLegalPages(distDir) {
  const errors = [];
  for (const page of LEGAL_PAGES) {
    const file = join(distDir, page, 'index.html');
    if (!existsSync(file)) {
      errors.push(`${page} : page absente du build (${file})`);
      continue;
    }
    const text = legalText(readFileSync(file, 'utf8'));
    if (text === null) {
      errors.push(`${page} : bloc <article data-legal> introuvable`);
      continue;
    }
    const found = placeholders(text);
    if (found.length) errors.push(`${page} : ${found.length} passage(s) à compléter — ${found.join(' · ')}`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = checkLegalPages(process.argv[2] || 'dist');
  if (errors.length) {
    console.error('\n✗ Pages juridiques incomplètes — publication bloquée :\n');
    for (const e of errors) console.error('  - ' + e);
    console.error('\nCompléter les crochets dans src/pages/{cgv,confidentialite,mentions-legales}.md.\n');
    process.exit(1);
  }
  console.log('✓ Pages juridiques complètes (aucun crochet).');
}
