import { SITE, DIGEST_DOMAINS } from "@config";
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      isTranslation: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image()
        .refine(img => img.width >= 1200 && img.height >= 630, {
          message: "OpenGraph image must be at least 1200 X 630 pixels!",
        })
        .or(z.string())
        .optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
    }),
});

const shortStories = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["short-story"]),
      ogImage: image()
        .refine(img => img.width >= 1200 && img.height >= 630, {
          message: "OpenGraph image must be at least 1200 X 630 pixels!",
        })
        .or(z.string())
        .optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
    }),
});

const originals = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    sourceUrl: z.string().optional(),
  }),
});

/**
 * Machine-generated daily digests. Deliberately a separate collection from
 * `blog`: there is one entry per day, so mixing them into `blog` would bury the
 * hand-written posts in every feed, tag page and search result.
 *
 * `sources` is structured rather than prose so the dashboard can aggregate and
 * render real, clickable links. Every URL originates from a fetched feed — the
 * generator never lets the model invent one.
 *
 * The domain vocabulary comes from src/config.ts, which scripts/digest/sources.mjs
 * mirrors for the Node side.
 */
const digest = defineCollection({
  type: "content",
  schema: z.object({
    date: z.coerce.date(),
    // Both are written by the generator and used for page and OG metadata.
    // Optional so a hand-written entry can omit them and fall back to the date.
    title: z.string().optional(),
    description: z.string().optional(),
    domains: z.array(z.enum(DIGEST_DOMAINS)),
    generatedBy: z.string(),
    reviewed: z.boolean().default(false),
    itemCount: z.number(),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          domain: z.enum(DIGEST_DOMAINS),
          label: z.string().optional(),
          publishedAt: z.coerce.date().optional(),
        })
      )
      .default([]),
  }),
});

export const collections = {
  blog,
  "short-stories": shortStories,
  originals,
  digest,
};
