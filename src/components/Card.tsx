import { slugifyStr } from "@utils/slugify";
import type { CollectionEntry } from "astro:content";
import { LOCALE } from "@config";

export interface Props {
  href?: string;
  frontmatter: CollectionEntry<"blog">["data"];
  secHeading?: boolean;
  itemClassName?: string;
  itemData?: Record<string, string>;
}

export default function Card({
  href,
  frontmatter,
  secHeading = true,
  itemClassName = "",
  itemData = {},
}: Props) {
  const { title, pubDatetime, modDatetime, description, tags } = frontmatter;
  const displayDate = new Date(
    modDatetime && modDatetime > pubDatetime ? modDatetime : pubDatetime
  ).toLocaleDateString(LOCALE.langTag, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className: "text-xl font-semibold leading-tight sm:text-2xl",
  };

  return (
    <li
      className={`group border-b border-skin-line ${itemClassName}`.trim()}
      {...itemData}
    >
      <a
        href={href}
        className="relative block px-1 py-6 text-skin-base no-underline sm:grid sm:grid-cols-[10rem_minmax(0,1fr)_4rem] sm:gap-6 sm:px-0 sm:py-7"
      >
        <div className="mb-3 flex items-center justify-between pr-8 text-xs font-semibold uppercase opacity-60 sm:mb-0 sm:block sm:pr-0">
          <time dateTime={new Date(pubDatetime).toISOString()}>
            {displayDate}
          </time>
          <span className="sm:mt-2 sm:block">{tags[0] ?? "Note"}</span>
        </div>
        <div>
          {secHeading ? (
            <h2 {...headerProps}>{title}</h2>
          ) : (
            <h3 {...headerProps}>{title}</h3>
          )}
          <p className="mb-0 mt-3 max-w-3xl text-sm leading-7 opacity-70">
            {description}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="absolute right-1 top-6 text-lg transition-transform group-hover:translate-x-1 sm:static sm:justify-self-end"
        >
          ↗
        </span>
      </a>
    </li>
  );
}
