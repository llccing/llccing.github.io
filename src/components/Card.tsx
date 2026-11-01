import { slugifyStr } from "@utils/slugify";
import type { CollectionEntry } from "astro:content";
import { LOCALE } from "@config";

export interface Props {
  href?: string;
  frontmatter: CollectionEntry<"blog">["data"];
  secHeading?: boolean;
  featured?: boolean;
  headingLevel?: 2 | 3 | 4 | 5;
  itemClassName?: string;
  itemData?: Record<string, string>;
}

/**
 * 视觉与 Card.astro 完全一致 —— 两者共用 editorial.css 里的 .doc-row 实现。
 * 这里保留 React 版本只是因为 Search.tsx 是客户端 island。
 */
export default function Card({
  href,
  frontmatter,
  secHeading = true,
  featured = false,
  headingLevel,
  itemClassName = "",
  itemData = {},
}: Props) {
  const { title, pubDatetime, modDatetime, description, tags } = frontmatter;

  const display = new Date(
    modDatetime && modDatetime > pubDatetime ? modDatetime : pubDatetime
  );

  const year = display.toLocaleDateString(LOCALE.langTag, { year: "numeric" });
  const monthDay = display.toLocaleDateString(LOCALE.langTag, {
    month: "short",
    day: "2-digit",
  });

  const level = headingLevel ?? (featured || secHeading ? 2 : 3);
  const HeadingTag = `h${level}` as "h2" | "h3" | "h4" | "h5";

  return (
    <li
      className={["doc-row", featured ? "doc-row--featured" : "", itemClassName]
        .filter(Boolean)
        .join(" ")}
      {...itemData}
    >
      <a href={href} className="doc-row__link">
        <span className="doc-row__date">
          <time
            dateTime={new Date(pubDatetime).toISOString()}
            className="doc-row__year"
          >
            {year}
          </time>
          <span className="doc-row__day">{monthDay}</span>
        </span>

        <span className="doc-row__body">
          <span className="doc-row__tags">
            {(tags[0] ?? "note").trim().toLowerCase()}
          </span>
          <HeadingTag
            className="doc-row__title"
            style={{ viewTransitionName: slugifyStr(title) }}
          >
            {title}
          </HeadingTag>
          {description && <p className="doc-row__desc">{description}</p>}
        </span>

        <span className="doc-row__go" aria-hidden="true">
          ↗
        </span>
      </a>
    </li>
  );
}
