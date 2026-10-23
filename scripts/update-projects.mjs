// Regenerates the Projects section of the profile README from the GitHub API.
// Everything between <!-- PROJECTS:START --> and <!-- PROJECTS:END --> is
// machine-managed; everything else is left untouched. Runs on a cron in
// GitHub Actions (GITHUB_TOKEN) and locally with anonymous quota.

import { readFileSync, writeFileSync } from 'node:fs';

const USER = 'alas-m';
const README = 'README.md';
const START = '<!-- PROJECTS:START -->';
const END = '<!-- PROJECTS:END -->';

// Repos never shown in the project table (websites / housekeeping)
const EXCLUDE = new Set([USER, 'cndshop.github.io', 'alas-m.github.io']);

// Official linguist colors for the language badge
const LANG_COLORS = {
  Python: '3776AB', JavaScript: 'F7DF1E', TypeScript: '3178C6', C: '555555',
  'C++': '00599C', 'C#': '178600', Go: '00ADD8', Rust: 'DEA584', Java: 'b07219',
  HTML: 'E34C26', CSS: '663399', Shell: '89E051', PowerShell: '012456',
  Batchfile: 'C1F12E', Vue: '41B883', Kotlin: 'A97BFF', Dart: '00B4AB',
};

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'readme-updater' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;

const res = await fetch(
  `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, { headers }
);
if (!res.ok) { console.error(`API ${res.status}: ${await res.text()}`); process.exit(1); }
const repos = await res.json();

const rows = repos
  .filter(r => !r.fork && !EXCLUDE.has(r.name))
  .map(r => {
    const name = `**[${r.name}](${r.html_url})**`;
    const desc = r.description ?? '*no description yet*';
    const lang = r.language
      ? `![${r.language}](https://img.shields.io/badge/${encodeURIComponent(r.language)}-${LANG_COLORS[r.language] ?? '8B949E'}?style=flat-square&labelColor=0D1117)`
      : '![code](https://img.shields.io/badge/code-8B949E?style=flat-square&labelColor=0D1117)';
    return `| ${name}<br>${lang} | ${desc.replaceAll('|', '\\|')} |`;
  });

const block = [
  START,
  '<p align="center"><samp>auto-generated from my public repos — refreshed every 6 hours</samp></p>',
  '',
  '| Project | About |',
  '|---|---|',
  ...rows,
  END,
].join('\n');

const md = readFileSync(README, 'utf8');
if (!md.includes(START) || !md.includes(END)) {
  console.error('Markers missing from README.md'); process.exit(1);
}
const next = md.replace(
  new RegExp(`${START.replace(/[/*]/g, m => `\\${m}`)}[\\s\\S]*?${END.replace(/[/*]/g, m => `\\${m}`)}`),
  block
);
writeFileSync(README, next);
console.log(`Wrote ${rows.length} projects to README.md`);
