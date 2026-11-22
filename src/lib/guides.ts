// The guides: Sedumo's manual pages for developers and plant IT, copied into content/guides/ by `npm run guides`
// when the site is built. Their text is never edited here.
import { renderGuide, type RenderedGuide } from "./markdown.ts";

export type Guide = {
  slug: string;
  file: string;
  title: string;
  summary: string;
};

// Each guide's address on this site, and how the Start and Guides pages name it.
export const GUIDES: Guide[] = [
  {
    slug: "api",
    file: "api-guide.md",
    title: "API guide",
    summary:
      "Tokens, printers and labels, printing, previews, following a print, offline printing, errors and limits.",
  },
  {
    slug: "plant-it",
    file: "it-guide.md",
    title: "Running workers: a guide for plant IT",
    summary:
      "Where a worker fits, the network it needs, printing over the LAN and without the internet, updates and security.",
  },
  {
    slug: "worker-setup",
    file: "worker-setup.md",
    title: "Set up the Sedumo worker",
    summary: "Install and link a worker on Windows, macOS, Linux and Docker.",
  },
  {
    slug: "ai-assistants",
    file: "ai-assistants.md",
    title: "AI assistants",
    summary:
      "Connect Claude or another assistant to your Sedumo account to design labels and forms, what it can do, and keeping it safe.",
  },
  {
    slug: "limits",
    file: "limits.md",
    title: "Limits",
    summary:
      "Every size, count and period, what depends on your plan, and the locks after wrong attempts.",
  },
];

const sources = import.meta.glob("/content/guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** The manual's file names and their pages here, for the links between guides. */
export const guidePaths: Record<string, string> = Object.fromEntries(
  GUIDES.map((g) => [g.file, `/guides/${g.slug}`]),
);

export function guideSource(guide: Guide): string | null {
  return sources[`/content/guides/${guide.file}`] ?? null;
}

export function hasGuides(): boolean {
  return GUIDES.some((g) => guideSource(g) !== null);
}

export function loadGuide(
  slug: string,
): (RenderedGuide & { guide: Guide }) | null {
  const guide = GUIDES.find((g) => g.slug === slug);
  const source = guide && guideSource(guide);
  return guide && source ? { guide, ...renderGuide(source, guidePaths) } : null;
}
