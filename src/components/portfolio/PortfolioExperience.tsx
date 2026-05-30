import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useState } from "react";

export interface PortfolioItem {
  id: string;
  type: string;
  company: string;
  role: string;
  period: string;
  location?: string;
  summary: string;
  accent: "sky" | "lavender" | "mint" | "peach";
  icon: "terminal" | "code" | "blocks";
  details: string[];
  tech: string[];
  impact: string;
}

interface ZhProfile {
  tagline?: string;
  summary?: string;
  targetRole?: string;
  education?: string;
}

interface ZhExperience {
  id: string;
  role?: string;
  summary?: string;
  details?: string[];
  impact?: string;
}

interface ZhFeaturedSystem {
  name?: string;
  summary?: string;
}

interface ZhPersonalLab {
  name?: string;
  role?: string;
  summary?: string;
  details?: string[];
}

interface ZhUi {
  backBlog?: string;
  featuredSystemsLabel?: string;
  featuredSystemsHeading?: string;
  careerLabel?: string;
  careerHeading?: string;
  careerSubtext?: string;
  personalLabLabel?: string;
  openDetails?: string;
  close?: string;
  education?: string;
  skillLabels?: {
    coreFrontend?: string;
    systemsBackend?: string;
    workflow?: string;
  };
}

interface ZhData {
  profile?: ZhProfile;
  metrics?: Array<{ value: string; label: string }>;
  featuredSystems?: ZhFeaturedSystem[];
  experiences?: ZhExperience[];
  personalLab?: ZhPersonalLab;
  ui?: ZhUi;
}

export interface PortfolioData {
  profile: {
    name: string;
    chineseName: string;
    birthday?: string;
    headline: string;
    tagline: string;
    location: string;
    email: string;
    phone?: string;
    website: string;
    targetRole: string;
    summary: string;
    education?: string;
    languages?: string[];
  };
  metrics?: Array<{ value: string; label: string }>;
  skills: {
    primary: string[];
    systems: string[];
    backend?: string[];
    miniPrograms?: string[];
    workflow: string[];
  };
  featuredSystems?: Array<{
    name: string;
    summary: string;
    tags: string[];
  }>;
  experiences: PortfolioItem[];
  personalLab?: {
    name: string;
    role: string;
    summary: string;
    details: string[];
    tech: string[];
  };
  zh?: ZhData;
}

const accentClass = {
  sky: "bg-[#dff3ff]",
  lavender: "bg-[#eee7ff]",
  mint: "bg-[#d8f3dc]",
  peach: "bg-[#ffe2c8]",
};

const accentBorderClass = {
  sky: "border-[#9bdcf8]",
  lavender: "border-[#c7b8ff]",
  mint: "border-[#a8ddb3]",
  peach: "border-[#ffc48e]",
};

function TechGlyph({ type }: { type: PortfolioItem["icon"] }) {
  if (type === "terminal") {
    return (
      <div className="rounded-2xl bg-[#202124] p-3 text-[#d8f3dc] shadow-sm">
        <div className="mb-2 flex gap-1">
          <span className="h-2 w-2 rounded-full bg-[#ff8a80]" />
          <span className="h-2 w-2 rounded-full bg-[#ffd180]" />
          <span className="h-2 w-2 rounded-full bg-[#a5d6a7]" />
        </div>
        <div className="font-mono text-[10px] leading-relaxed">
          <div>$ ng build</div>
          <div className="text-[#80cbc4]">check-in.ready()</div>
        </div>
      </div>
    );
  }

  if (type === "code") {
    return (
      <div className="rounded-2xl bg-white/70 p-3 font-mono text-[10px] leading-relaxed text-[#4c463d] shadow-sm ring-1 ring-black/5">
        <div>
          <span className="text-[#7c4dff]">const</span> engineer =
        </div>
        <div>{"{ ai: 'amplifier' }"}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/60 p-3 shadow-sm ring-1 ring-black/5">
      <span className="h-8 rounded-xl bg-[#ffe2c8]" />
      <span className="h-8 rounded-xl bg-[#dff3ff]" />
      <span className="h-8 rounded-xl bg-[#eee7ff]" />
      <span className="h-8 rounded-xl bg-[#d8f3dc]" />
    </div>
  );
}

function MagneticCard({
  item,
  openLabel,
  onOpen,
}: {
  item: PortfolioItem;
  openLabel: string;
  onOpen: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 18 });
  const springY = useSpring(y, { stiffness: 180, damping: 18 });
  const rotateX = useTransform(springY, [-26, 26], [2.5, -2.5]);
  const rotateY = useTransform(springX, [-26, 26], [-2.5, 2.5]);

  return (
    <motion.button
      type="button"
      layoutId={`card-${item.id}`}
      onClick={onOpen}
      onMouseMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={{ y: -8, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className={`group flex min-h-[300px] w-full cursor-pointer flex-col rounded-[2rem] ${accentClass[item.accent]} p-6 text-left text-[#202124] shadow-[0_18px_55px_rgba(72,60,42,0.10)] ring-1 ring-black/5 transition-shadow hover:shadow-[0_26px_75px_rgba(72,60,42,0.16)]`}
    >
      <motion.div layoutId={`glyph-${item.id}`} className="mb-7 w-28">
        <TechGlyph type={item.icon} />
      </motion.div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f6b63]">
        <span className="rounded-full bg-white/60 px-3 py-1">{item.type}</span>
        <span>{item.period}</span>
      </div>
      <motion.h3
        layoutId={`title-${item.id}`}
        className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl"
      >
        {item.company}
      </motion.h3>
      <p className="mt-2 text-sm font-bold text-[#4c463d]">{item.role}</p>
      <p className="mt-4 flex-1 text-base leading-7 text-[#4c463d]">
        {item.summary}
      </p>
      <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#202124]">
        {openLabel}
        <span className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </motion.button>
  );
}

function SkillCloud({ title, skills }: { title: string; skills: string[] }) {
  return (
    <div className="rounded-[1.75rem] bg-white/65 p-5 ring-1 ring-black/5">
      <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#8a8174]">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {skills.map(skill => (
          <span
            key={skill}
            className="rounded-full bg-[#202124] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioExperience({ data }: { data: PortfolioData }) {
  const [selected, setSelected] = useState<PortfolioItem | null>(null);
  const [lang, setLang] = useState<"en" | "zh">("en");

  const zh = data.zh;
  const isZh = lang === "zh";

  const t = (en: string, zhText: string | undefined) =>
    isZh && zhText ? zhText : en;

  const profile = { ...data.profile, ...(isZh ? zh?.profile : {}) };
  const metrics = isZh && zh?.metrics ? zh.metrics : (data.metrics ?? []);

  const featuredSystems = (data.featuredSystems ?? []).map((sys, i) => ({
    ...sys,
    name: t(sys.name, zh?.featuredSystems?.[i]?.name),
    summary: t(sys.summary, zh?.featuredSystems?.[i]?.summary),
  }));

  const experiences = data.experiences.map(exp => {
    const zhExp = zh?.experiences?.find(e => e.id === exp.id);
    return {
      ...exp,
      role: t(exp.role, zhExp?.role),
      summary: t(exp.summary, zhExp?.summary),
      details: isZh && zhExp?.details ? zhExp.details : exp.details,
      impact: t(exp.impact, zhExp?.impact),
    };
  });

  const personalLab = data.personalLab
    ? {
        ...data.personalLab,
        name: t(data.personalLab.name, zh?.personalLab?.name),
        role: t(data.personalLab.role, zh?.personalLab?.role),
        summary: t(data.personalLab.summary, zh?.personalLab?.summary),
        details:
          isZh && zh?.personalLab?.details
            ? zh.personalLab.details
            : data.personalLab.details,
      }
    : undefined;

  const ui = {
    backBlog: t("\u2190 Blog", zh?.ui?.backBlog),
    featuredSystemsLabel: t("Featured Systems", zh?.ui?.featuredSystemsLabel),
    featuredSystemsHeading: t(
      "Enterprise scale, product taste.",
      zh?.ui?.featuredSystemsHeading
    ),
    careerLabel: t("Career Timeline", zh?.ui?.careerLabel),
    careerHeading: t("Impact first. Depth on tap.", zh?.ui?.careerHeading),
    careerSubtext: t(
      "Six roles compressed into portfolio cards. Click any card for the resume-level detail: stack, responsibility and impact.",
      zh?.ui?.careerSubtext
    ),
    personalLabLabel: t("Personal Lab", zh?.ui?.personalLabLabel),
    openDetails: t("Open details", zh?.ui?.openDetails),
    close: t("Close", zh?.ui?.close),
    education: t("Education", zh?.ui?.education),
    coreFrontend: t("Core frontend", zh?.ui?.skillLabels?.coreFrontend),
    systemsBackend: t("Systems & backend", zh?.ui?.skillLabels?.systemsBackend),
    workflow: t("Workflow", zh?.ui?.skillLabels?.workflow),
  };

  const heroSkills = [
    ...data.skills.primary,
    ...data.skills.systems.slice(0, 4),
    ...data.skills.workflow.slice(0, 3),
  ];

  return (
    <div className="portfolio-page min-h-screen bg-[#f6f3ec] px-4 py-8 font-sans text-[#202124] sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 1, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-full bg-white/70 px-5 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur"
        >
          <a
            href="/"
            className="rounded-full px-3 py-2 text-sm font-semibold no-underline hover:bg-[#f6f3ec]"
          >
            {ui.backBlog}
          </a>
          <div className="flex items-center gap-2 text-sm text-[#6f6b63]">
            <a
              className="rounded-full px-3 py-2 no-underline hover:bg-[#f6f3ec]"
              href={`mailto:${data.profile.email}`}
            >
              Email
            </a>
            <a
              className="rounded-full px-3 py-2 no-underline hover:bg-[#f6f3ec]"
              href={data.profile.website}
            >
              Website
            </a>
            <div className="ml-2 flex rounded-full bg-[#f0ece3] p-0.5">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${lang === "en" ? "bg-[#202124] text-white" : "text-[#6f6b63] hover:text-[#202124]"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("zh")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${lang === "zh" ? "bg-[#202124] text-white" : "text-[#6f6b63] hover:text-[#202124]"}`}
              >
                {"\u4e2d\u6587"}
              </button>
            </div>
          </div>
        </motion.nav>

        {/* Hero */}
        <div className="grid gap-6 px-0 lg:grid-cols-[1.35fr_0.65fr]">
          <motion.div
            initial={{ opacity: 1, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[2.5rem] bg-[#fffaf0] p-8 shadow-[0_24px_80px_rgba(72,60,42,0.10)] ring-1 ring-black/5 sm:p-12"
          >
            <p className="mb-5 inline-flex rounded-full bg-[#d8f3dc] px-4 py-2 text-sm font-semibold text-[#335c45]">
              {profile.targetRole}
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.08em] sm:text-7xl lg:text-8xl">
              {data.profile.name}
              <span className="block text-[#7c7468]">
                {data.profile.chineseName}
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-xl leading-9 text-[#4c463d]">
              {profile.tagline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {heroSkills.map(skill => (
                <span
                  key={skill}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#4c463d] shadow-sm ring-1 ring-black/5"
                >
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 1, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="rounded-[2.5rem] bg-[#202124] p-6 text-white shadow-[0_24px_80px_rgba(72,60,42,0.14)]"
          >
            <div className="rounded-[1.8rem] bg-white/10 p-5 font-mono text-sm leading-7 text-[#d8f3dc]">
              <div className="text-[#ffd180]">rowan@portfolio:~$</div>
              <div>cat mission.txt</div>
              <div className="mt-4 text-white">{profile.summary}</div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {metrics.map(metric => (
                <div
                  key={metric.value + metric.label}
                  className="rounded-3xl bg-white p-4 text-[#202124]"
                >
                  <b className="text-2xl tracking-[-0.05em]">{metric.value}</b>
                  <br />
                  <span className="text-xs font-semibold text-[#6f6b63]">
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>
            {profile.education && (
              <div className="mt-5 rounded-3xl bg-white/10 p-5 text-sm leading-7 text-white/85">
                <b className="text-white">{ui.education}</b>
                <br />
                {profile.education}
              </div>
            )}
          </motion.aside>
        </div>

        {/* Featured Systems */}
        <div className="py-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8a8174]">
                {ui.featuredSystemsLabel}
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                {ui.featuredSystemsHeading}
              </h2>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {featuredSystems.map((system, i) => (
              <motion.article
                key={data.featuredSystems?.[i]?.name ?? system.name}
                whileHover={{ y: -5 }}
                className="rounded-[2rem] bg-white/70 p-6 shadow-sm ring-1 ring-black/5"
              >
                <h3 className="text-2xl font-black tracking-[-0.05em]">
                  {system.name}
                </h3>
                <p className="mt-4 leading-7 text-[#5f584f]">
                  {system.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {data.featuredSystems?.[i]?.tags.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f6f3ec] px-3 py-1.5 text-xs font-bold text-[#4c463d]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {/* Career Timeline */}
        <div className="px-0 py-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8a8174]">
                {ui.careerLabel}
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                {ui.careerHeading}
              </h2>
            </div>
            <p className="max-w-md text-[#6f6b63]">{ui.careerSubtext}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {experiences.map(item => (
              <MagneticCard
                key={item.id}
                item={item}
                openLabel={ui.openDetails}
                onOpen={() => setSelected(item)}
              />
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="grid gap-5 py-14 lg:grid-cols-3">
          <SkillCloud title={ui.coreFrontend} skills={data.skills.primary} />
          <SkillCloud
            title={ui.systemsBackend}
            skills={[...data.skills.systems, ...(data.skills.backend ?? [])]}
          />
          <SkillCloud
            title={ui.workflow}
            skills={[
              ...(data.skills.miniPrograms ?? []),
              ...data.skills.workflow,
            ]}
          />
        </div>

        {/* Personal Lab */}
        {personalLab && (
          <div className="pb-16">
            <div className="rounded-[2.5rem] bg-[#d8f3dc] p-8 shadow-[0_24px_80px_rgba(72,60,42,0.10)] ring-1 ring-black/5 sm:p-10">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#3f6b4c]">
                {ui.personalLabLabel}
              </p>
              <div className="mt-4 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                <div>
                  <h2 className="text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                    {personalLab.name}
                  </h2>
                  <p className="mt-3 font-bold text-[#335c45]">
                    {personalLab.role}
                  </p>
                  <p className="mt-5 text-lg leading-8 text-[#3f3a33]">
                    {personalLab.summary}
                  </p>
                </div>
                <div>
                  <ul className="grid gap-3">
                    {personalLab.details.map((detail, i) => (
                      <li
                        key={i}
                        className="rounded-3xl bg-white/60 p-4 leading-7 text-[#3f3a33] ring-1 ring-black/5"
                      >
                        {detail}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {data.personalLab?.tech.map(tech => (
                      <span
                        key={tech}
                        className="rounded-full bg-[#202124] px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#202124]/35 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.article
              layoutId={`card-${selected.id}`}
              onClick={event => event.stopPropagation()}
              className={`max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] ${accentClass[selected.accent]} p-6 text-[#202124] shadow-[0_30px_110px_rgba(32,33,36,0.28)] sm:p-8`}
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <motion.div layoutId={`glyph-${selected.id}`} className="w-32">
                  <TechGlyph type={selected.icon} />
                </motion.div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-[#202124] shadow-sm transition hover:bg-white"
                >
                  {ui.close}
                </button>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6f6b63]">
                {selected.role} · {selected.period}
                {selected.location ? ` · ${selected.location}` : ""}
              </p>
              <motion.h3
                layoutId={`title-${selected.id}`}
                className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl"
              >
                {selected.company}
              </motion.h3>
              <p className="mt-5 rounded-3xl bg-white/55 p-5 text-lg leading-8 text-[#4c463d]">
                {selected.impact}
              </p>
              <ul className="mt-6 grid gap-3 md:grid-cols-2">
                {selected.details.map((detail, i) => (
                  <li
                    key={i}
                    className={`rounded-3xl border-l-4 ${accentBorderClass[selected.accent]} bg-white/60 p-4 leading-7 text-[#3f3a33] ring-1 ring-black/5`}
                  >
                    {detail}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {selected.tech.map(tech => (
                  <span
                    key={tech}
                    className="rounded-full bg-[#202124] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
