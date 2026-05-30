# Tag Taxonomy

## Goal
- Keep tags useful for readers as navigation, not as internal maintenance labels.
- Use one consistent naming style across the whole site.
- Prefer fewer, clearer tags over many overlapping tags.

## Rules
- Use lowercase English tags, preferably kebab-case.
- Keep each post to 1-3 tags when practical.
- Prefer one primary topic tag plus up to two secondary tags.
- Do not use both Chinese and English variants for the same concept.
- Do not use filler tags like `blog`.
- Avoid workflow tags in `tags`, such as `translation`, because translation state is already represented by content fields.
- Keep reader-facing series tags only when they help browsing, such as `english-learning`, `daily-reading`, `reflection`, `shanghai`, `career`, `blogging`.

## Canonical Names
- Use `ai`, not `AI`.
- Use `nodejs`, not `node`.
- Use `github`, not `GitHub`.
- Avoid generic `frontend` unless it is truly the only meaningful label.

## Angular Vocabulary
- Primary tag: `angular`
- Secondary tags used today:
  - `animations`
  - `change-detection`
  - `dependency-injection`
  - `i18n`
  - `lazy-loading`
  - `lifecycle`
  - `performance`
  - `rendering`
  - `signals`
  - `ssr`
  - `hydration`
  - `tooling`
  - `zoneless`

## What To Avoid
- `Angular`, `Signal`, `前端`, `有角的`
- `blog`, `translation`
- Mixing framework tags with content-type tags in the same post
- Creating a new tag when an existing Angular secondary tag already covers the topic

## Migration Direction
- Angular posts should converge on `angular` plus 0-2 concrete secondary topic tags.
- Daily English posts should converge on `english-learning` + `daily-reading` + one topic tag.
- Translation posts should drop `translation` from tags and rely on `isTranslation` instead.
- Personal essays should use meaningful reader-facing tags like `reflection`, `career`, `shanghai`, or `blogging` instead of `blog`.