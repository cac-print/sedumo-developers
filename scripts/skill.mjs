// Copies the Sedumo skill (skills/sedumo/) into static/skills/ (not in git), so the site serves its files and a zip of
// the folder to install or to upload in the Claude apps: /skills/sedumo/SKILL.md, /skills/sedumo.zip. Runs before every build.
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { zipSync } from "fflate";

const source = "skills/sedumo";
const out = "static/skills";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(source, join(out, "sedumo"), { recursive: true });

/** @type {import('fflate').Zippable} */
const files = {};
/** @param {string} dir */
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    // Forward slashes in a zip, whatever the system that builds it.
    else
      files[`sedumo/${relative(source, path).split(sep).join("/")}`] = [
        readFileSync(path),
        { mtime: new Date("2026-01-01") },
      ];
  }
};
walk(source);
writeFileSync(join(out, "sedumo.zip"), zipSync(files, { level: 9 }));
console.log(
  `Sedumo skill: ${Object.keys(files).length} files, ${out}/sedumo.zip`,
);
