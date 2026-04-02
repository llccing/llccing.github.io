import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Howl } from "howler";
import type { RadioCategory, RadioTrack } from "@pages/radio/radio-data";

/* ───────── helpers ───────── */

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

/* animated equalizer bars (pure CSS) */
const EqualizerIcon = () => (
  <span className="inline-flex items-end gap-[2px] h-3.5 w-3.5">
    {[1, 2, 3].map(i => (
      <span
        key={i}
        className="inline-block w-[3px] rounded-sm bg-emerald-500 dark:bg-emerald-400"
        style={{
          animation: `eq-bar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
        }}
      />
    ))}
    <style>{`
      @keyframes eq-bar {
        0%   { height: 30%; }
        100% { height: 100%; }
      }
    `}</style>
  </span>
);

/* ───────── types ───────── */

export type RadioPlayerProps = {
  categories: RadioCategory[];
  initialCategoryId?: string;
};

const playbackSpeedOptions = [0.75, 1, 1.25, 1.5, 2];

/* ───────── component ───────── */

const RadioPlayer = ({ categories, initialCategoryId }: RadioPlayerProps) => {
  const defaultCategoryId = initialCategoryId ?? categories[0]?.id ?? "";

  const [selectedCategoryId, setSelectedCategoryId] =
    useState(defaultCategoryId);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(
    categories.find(c => c.id === defaultCategoryId)?.tracks[0]?.id ?? null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  const howlRef = useRef<Howl | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  /* ── derived ── */

  const currentCategory = useMemo(
    () => categories.find(c => c.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const currentTrack: RadioTrack | undefined = useMemo(() => {
    if (!currentCategory) return undefined;
    return (
      currentCategory.tracks.find(t => t.id === currentTrackId) ??
      currentCategory.tracks[0]
    );
  }, [currentCategory, currentTrackId]);

  /* ── progress timer ── */

  const stopProgressTimer = () => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgressTimer = () => {
    stopProgressTimer();
    progressIntervalRef.current = window.setInterval(() => {
      const sound = howlRef.current;
      if (!sound || !sound.playing()) return;
      const seek = sound.seek() as number;
      const duration = sound.duration();
      setElapsedSeconds(seek);
      setDurationSeconds(duration);
      if (duration > 0) setProgressPercent((seek / duration) * 100);
    }, 400);
  };

  const cleanupHowl = () => {
    stopProgressTimer();
    howlRef.current?.stop();
    howlRef.current?.unload();
    howlRef.current = null;
  };

  /* ── effects ── */

  useEffect(() => () => cleanupHowl(), []);

  useEffect(() => {
    if (!currentCategory) {
      setCurrentTrackId(null);
      return;
    }
    if (
      !currentTrack ||
      !currentCategory.tracks.some(t => t.id === currentTrack.id)
    ) {
      setCurrentTrackId(currentCategory.tracks[0]?.id ?? null);
    }
  }, [currentCategory, currentTrack]);

  useEffect(() => {
    if (!currentTrack) {
      cleanupHowl();
      return;
    }
    cleanupHowl();
    setIsLoading(true);
    setIsPlaying(false);
    setProgressPercent(0);
    setElapsedSeconds(0);
    setDurationSeconds(0);

    const sound = new Howl({
      src: [currentTrack.src],
      html5: true,
      preload: true,
      rate: playbackRate,
      onend: () => handleNext(),
      onload: () => {
        setIsLoading(false);
        setDurationSeconds(sound.duration());
      },
      onplay: () => {
        setIsPlaying(true);
        setIsLoading(false);
        startProgressTimer();
      },
      onpause: () => {
        setIsPlaying(false);
        stopProgressTimer();
      },
      onstop: () => {
        setIsPlaying(false);
        stopProgressTimer();
        setProgressPercent(0);
        setElapsedSeconds(0);
      },
    });

    howlRef.current = sound;
    sound.play();
  }, [currentTrack?.id]);

  useEffect(() => {
    const sound = howlRef.current;
    if (sound) sound.rate(playbackRate);
  }, [playbackRate]);

  /* ── handlers ── */

  const handlePlayPause = () => {
    const sound = howlRef.current;
    if (!sound) return;
    if (sound.playing()) {
      sound.pause();
    } else {
      sound.play();
    }
  };

  const handleTrackSelect = (trackId: string) => {
    if (currentTrackId === trackId && howlRef.current) {
      handlePlayPause();
      return;
    }
    setCurrentTrackId(trackId);
  };

  const getAdjacentTrackId = (dir: "next" | "prev"): string | null => {
    if (!currentCategory || !currentTrack) return null;
    const idx = currentCategory.tracks.findIndex(
      t => t.id === currentTrack.id
    );
    if (idx === -1) return currentCategory.tracks[0]?.id ?? null;
    return dir === "next"
      ? currentCategory.tracks[idx + 1]?.id ?? null
      : currentCategory.tracks[idx - 1]?.id ?? null;
  };

  const handleNext = () => {
    const nextId = getAdjacentTrackId("next");
    if (nextId) setCurrentTrackId(nextId);
    else howlRef.current?.stop();
  };

  const handlePrevious = () => {
    const prevId = getAdjacentTrackId("prev");
    if (prevId) setCurrentTrackId(prevId);
  };

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === selectedCategoryId) return;
    cleanupHowl();
    setIsPlaying(false);
    setProgressPercent(0);
    setElapsedSeconds(0);
    setDurationSeconds(0);
    setSelectedCategoryId(categoryId);
    const cat = categories.find(c => c.id === categoryId);
    setCurrentTrackId(cat?.tracks[0]?.id ?? null);
  };

  const handlePlayAll = () => {
    if (!currentCategory?.tracks.length) return;
    const firstId = currentCategory.tracks[0].id;
    if (currentTrackId === firstId && howlRef.current?.playing()) return;
    setCurrentTrackId(firstId);
  };

  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    const sound = howlRef.current;
    if (!sound) return;
    const dur = sound.duration();
    if (!Number.isFinite(dur) || dur <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const t = pct * dur;
    sound.seek(t);
    setElapsedSeconds(t);
    setProgressPercent(pct * 100);
  };

  const trackCount = currentCategory?.tracks.length ?? 0;

  /* cover initials */
  const coverInitials = currentCategory?.title
    ? currentCategory.title
        .split(" ")
        .slice(0, 3)
        .map(w => w[0])
        .join("")
    : "♪";

  /* ───────── render ───────── */

  return (
    <section className="pb-32 sm:pb-36">
      {/* ── Album Header ── */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
        {/* Cover */}
        <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-3xl font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 sm:h-52 sm:w-52">
          {coverInitials}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
            Audiobook
          </p>
          <h2 className="mt-1.5 text-2xl font-bold leading-tight text-slate-900 dark:text-gray-100 sm:text-3xl">
            {currentCategory?.title ?? "Select a collection"}
          </h2>
          {currentCategory?.author && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              by {currentCategory.author}
            </p>
          )}
          {currentCategory?.description && (
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {currentCategory.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePlayAll}
              disabled={!trackCount}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600 active:scale-95 disabled:opacity-40"
            >
              <svg
                className="h-4 w-4 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Play All
            </button>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {trackCount} chapters
            </span>
          </div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      {categories.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                cat.id === selectedCategoryId
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {/* ── Track List ── */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* header */}
        <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-gray-400 dark:border-gray-800 dark:bg-slate-900/60 dark:text-gray-500">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">Title</span>
          <span className="w-14 text-right">
            <svg
              className="ml-auto h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx={12} cy={12} r={10} />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        </div>

        {/* rows */}
        <div className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800/60">
          {currentCategory?.tracks.length ? (
            currentCategory.tracks.map((track, idx) => {
              const isActive = track.id === currentTrack?.id;
              const isHovered = track.id === hoveredTrackId;

              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleTrackSelect(track.id)}
                  onMouseEnter={() => setHoveredTrackId(track.id)}
                  onMouseLeave={() => setHoveredTrackId(null)}
                  className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? "bg-emerald-50/70 dark:bg-emerald-900/10"
                      : "hover:bg-gray-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {/* track number / icon */}
                  <span className="flex h-5 w-8 items-center justify-center text-sm">
                    {isActive && isPlaying ? (
                      <EqualizerIcon />
                    ) : isActive && !isPlaying ? (
                      <svg
                        className="h-4 w-4 fill-emerald-500 dark:fill-emerald-400"
                        viewBox="0 0 24 24"
                      >
                        <rect x={6} y={5} width={4} height={14} rx={1} />
                        <rect x={14} y={5} width={4} height={14} rx={1} />
                      </svg>
                    ) : isHovered ? (
                      <svg
                        className="h-4 w-4 fill-gray-600 dark:fill-gray-300"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-400">
                        {idx + 1}
                      </span>
                    )}
                  </span>

                  {/* title */}
                  <span
                    className={`flex-1 truncate text-sm font-medium ${
                      isActive
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-gray-800 dark:text-gray-50"
                    }`}
                  >
                    {track.title}
                  </span>

                  {/* duration / now playing badge */}
                  <span className="w-14 text-right text-xs">
                    {isActive ? (
                      <span className="font-semibold uppercase tracking-wide text-emerald-500 dark:text-emerald-400">
                        {isPlaying ? "LIVE" : "PAUSED"}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">
                        {track.duration ?? "—"}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No chapters available for this collection yet.
            </p>
          )}
        </div>
      </div>

      {/* ── Persistent Bottom Player ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/80 backdrop-blur-xl dark:border-gray-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          {currentTrack && (isPlaying || isLoading || elapsedSeconds > 0) ? (
            <>
              {/* progress bar (full width, thin) */}
              <div
                className="group -mt-3 mb-2 cursor-pointer pt-1 pb-1"
                onClick={handleSeek}
                role="slider"
                aria-label="Seek through current track"
                aria-valuenow={Math.round(progressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                tabIndex={0}
              >
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-gray-200 transition group-hover:h-2 dark:bg-gray-700">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-emerald-500 transition-[width] duration-300 dark:bg-emerald-400"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* track info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {currentTrack.title}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {currentCategory?.title}
                    {currentCategory?.author
                      ? ` · ${currentCategory.author}`
                      : ""}
                  </p>
                </div>

                {/* time */}
                <div className="hidden text-xs text-gray-400 dark:text-gray-500 sm:block">
                  {formatDuration(elapsedSeconds)} /{" "}
                  {formatDuration(durationSeconds)}
                </div>

                {/* controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={!getAdjacentTrackId("prev")}
                    className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-slate-800"
                    aria-label="Previous"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isLoading ? (
                      <svg
                        className="h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx={12}
                          cy={12}
                          r={10}
                          stroke="currentColor"
                          strokeWidth={4}
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    ) : isPlaying ? (
                      <svg
                        className="h-5 w-5 fill-current"
                        viewBox="0 0 24 24"
                      >
                        <rect x={6} y={5} width={4} height={14} rx={1} />
                        <rect x={14} y={5} width={4} height={14} rx={1} />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 fill-current"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!getAdjacentTrackId("next")}
                    className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-slate-800"
                    aria-label="Next"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                </div>

                {/* speed */}
                <div className="hidden items-center gap-1 sm:flex">
                  {playbackSpeedOptions.map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setPlaybackRate(rate)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                        playbackRate === rate
                          ? "bg-emerald-500 text-white"
                          : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                      }`}
                    >
                      {rate === 1 ? "1x" : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* idle state */
            <div className="flex items-center justify-center gap-3 py-1">
              <svg
                className="h-5 w-5 text-gray-300 dark:text-gray-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <span className="text-sm text-gray-400 dark:text-gray-500">
                Select a chapter to begin listening
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RadioPlayer;
