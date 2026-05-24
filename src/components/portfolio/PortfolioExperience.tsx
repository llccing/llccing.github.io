import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useState } from "react";

interface PortfolioItem {
  id: string;
  type: string;
  company: string;
  role: string;
  period: string;
  summary: string;
  accent: "sky" | "lavender" | "mint" | "peach";
  icon: "terminal" | "code" | "blocks";
  details: string[];
  tech: string[];
  impact: string;
}

interface PortfolioData {
  profile: {
    name: string;
    chineseName: string;
    headline: string;
    tagline: string;
    location: string;
    email: string;
    website: string;
    targetRole: string;
    summary: string;
  };
  skills: {
    primary: string[];
    systems: string[];
    workflow: string[];
  };
  experiences: PortfolioItem[];
}

const accentClass = {
  sky: "bg-[#dff3ff]",
  lavender: "bg-[#eee7ff]",
  mint: "bg-[#d8f3dc]",
  peach: "bg-[#ffe2c8]",
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
  onOpen,
}: {
  item: PortfolioItem;
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
      whileHover={{ y: -8, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      className={`group min-h-[260px] w-full cursor-pointer rounded-[2rem] ${accentClass[item.accent]} p-6 text-left text-[#202124] shadow-[0_18px_55px_rgba(72,60,42,0.10)] ring-1 ring-black/5 transition-shadow hover:shadow-[0_26px_75px_rgba(72,60,42,0.16)]`}
    >
      <motion.div layoutId={`glyph-${item.id}`} className="mb-8 w-28">
        <TechGlyph type={item.icon} />
      </motion.div>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f6b63]">
        <span className="rounded-full bg-white/60 px-3 py-1">{item.type}</span>
        <span>{item.period}</span>
      </div>
      <motion.h3
        layoutId={`title-${item.id}`}
        className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl"
      >
        {item.company}
      </motion.h3>
      <p className="mt-3 text-base leading-7 text-[#4c463d]">{item.summary}</p>
      <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#202124]">
        Open details
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </div>
    </motion.button>
  );
}

export default function PortfolioExperience({ data }: { data: PortfolioData }) {
  const [selected, setSelected] = useState<PortfolioItem | null>(null);
  const allSkills = [
    ...data.skills.primary,
    ...data.skills.systems.slice(0, 4),
    ...data.skills.workflow.slice(0, 3),
  ];

  return (
    <div className="min-h-screen bg-[#f6f3ec] px-4 py-8 font-sans text-[#202124] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-full bg-white/70 px-5 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur"
        >
          <a
            href="/"
            className="rounded-full px-3 py-2 text-sm font-semibold no-underline hover:bg-[#f6f3ec]"
          >
            ← Blog
          </a>
          <div className="flex gap-2 text-sm text-[#6f6b63]">
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
          </div>
        </motion.nav>

        <section className="grid gap-6 px-0 sm:grid-cols-[1.25fr_0.75fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-[2.5rem] bg-[#fffaf0] p-8 shadow-[0_24px_80px_rgba(72,60,42,0.10)] ring-1 ring-black/5 sm:p-12"
          >
            <p className="mb-5 inline-flex rounded-full bg-[#d8f3dc] px-4 py-2 text-sm font-semibold text-[#335c45]">
              {data.profile.targetRole}
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.08em] sm:text-7xl">
              {data.profile.name}
              <span className="block text-[#7c7468]">{data.profile.chineseName}</span>
            </h1>
            <p className="mt-8 max-w-2xl text-xl leading-9 text-[#4c463d]">
              {data.profile.tagline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {allSkills.map(skill => (
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
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="rounded-[2.5rem] bg-[#202124] p-6 text-white shadow-[0_24px_80px_rgba(72,60,42,0.14)]"
          >
            <div className="rounded-[1.8rem] bg-white/10 p-5 font-mono text-sm leading-7 text-[#d8f3dc]">
              <div className="text-[#ffd180]">rowan@portfolio:~$</div>
              <div>cat mission.txt</div>
              <div className="mt-4 text-white">{data.profile.summary}</div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-[#dff3ff] p-4 text-[#202124]">
                <b>10y</b>
                <br />
                Frontend
              </div>
              <div className="rounded-3xl bg-[#ffe2c8] p-4 text-[#202124]">
                <b>BFF</b>
                <br />
                Node.js
              </div>
              <div className="rounded-3xl bg-[#eee7ff] p-4 text-[#202124]">
                <b>AI</b>
                <br />
                Workflow
              </div>
              <div className="rounded-3xl bg-[#d8f3dc] p-4 text-[#202124]">
                <b>SH</b>
                <br />
                Shanghai
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="px-0 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8a8174]">
                Progressive Disclosure
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
                Impact first. Depth on tap.
              </h2>
            </div>
            <p className="max-w-md text-[#6f6b63]">
              Cards stay minimal until clicked, then expand into hard technical
              detail with shared layout motion.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {data.experiences.map(item => (
              <MagneticCard
                key={item.id}
                item={item}
                onOpen={() => setSelected(item)}
              />
            ))}
          </div>
        </section>
      </div>

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
              className={`max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] ${accentClass[selected.accent]} p-6 text-[#202124] shadow-[0_30px_110px_rgba(32,33,36,0.28)] sm:p-8`}
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
                  Close
                </button>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6f6b63]">
                {selected.role} · {selected.period}
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
              <ul className="mt-6 space-y-3">
                {selected.details.map(detail => (
                  <li
                    key={detail}
                    className="rounded-3xl bg-white/60 p-4 leading-7 text-[#3f3a33] ring-1 ring-black/5"
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
