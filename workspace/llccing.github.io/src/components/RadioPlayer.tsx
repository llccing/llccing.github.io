import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Howl } from "howler";
import type { RadioCategory, RadioTrack } from "@pages/radio/radio-data";

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remaining}`;
};

export type RadioPlayerProps = {
  categories: RadioCategory[];
  initialCategoryId?: string;
};

const playbackSpeedOptions = [0.75, 1, 1.25, 1.5, 2];

const RadioPlayer = ({ categories, initialCategoryId }: RadioPlayerProps) => {
  const defaultCategoryId = initialCategoryId ?? categories[0]?.id ?? "";
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(defaultCategoryId);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(
    categories.find(category => category.id === defaultCategoryId)?.tracks[0]
      ?.id ?? null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const howlRef = useRef<Howl | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const currentCategory = useMemo(
    () => categories.find(category => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  );

  const currentTrack: RadioTrack | undefined = useMemo(() => {
    if (!currentCategory) {
      return undefined;
    }
    return (
      currentCategory.tracks.find(track => track.id === currentTrackId) ??
      currentCategory.tracks[0]
    );
  }, [currentCategory, currentTrackId]);

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
      if (!sound || !sound.playing()) {
        return;
      }
      const seek = sound.seek() as number;
      const duration = sound.duration();
      setElapsedSeconds(seek);
      setDurationSeconds(duration);
      if (duration > 0) {
        setProgressPercent((seek / duration) * 100);
      }
    }, 500);
  };

  const cleanupHowl = () => {
    stopProgressTimer();
    howlRef.current?.stop();
    howlRef.current?.unload();
    howlRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanupHowl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentCategory) {
      setCurrentTrackId(null);
      return;
    }

    if (
      !currentTrack ||
      !currentCategory.tracks.some(track => track.id === currentTrack.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  useEffect(() => {
    const sound = howlRef.current;
    if (!sound) {
      return;
    }
    sound.rate(playbackRate);
  }, [playbackRate]);

  const handlePlayPause = () => {
    const sound = howlRef.current;
    if (!sound) {
      return;
    }
    if (sound.playing()) {
      sound.pause();
      setIsPlaying(false);
      return;
    }
    sound.play();
  };

  const handleTrackSelect = (trackId: string) => {
    if (currentTrackId === trackId && howlRef.current) {
      handlePlayPause();
      return;
    }
    setCurrentTrackId(trackId);
  };

  const getAdjacentTrackId = (direction: "next" | "prev"): string | null => {
    if (
      !currentCategory ||
      currentCategory.tracks.length === 0 ||
      !currentTrack
    ) {
      return null;
    }
    const index = currentCategory.tracks.findIndex(
      track => track.id === currentTrack.id
    );
    if (index === -1) {
      return currentCategory.tracks[0]?.id ?? null;
    }
    if (direction === "next") {
      return currentCategory.tracks[index + 1]?.id ?? null;
    }
    return currentCategory.tracks[index - 1]?.id ?? null;
  };

  const handleNext = () => {
    const nextId = getAdjacentTrackId("next");
    if (nextId) {
      setCurrentTrackId(nextId);
    } else {
      howlRef.current?.stop();
    }
  };

  const handlePrevious = () => {
    const prevId = getAdjacentTrackId("prev");
    if (prevId) {
      setCurrentTrackId(prevId);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = categories.find(item => item.id === categoryId);
    if (category?.tracks[0]) {
      setCurrentTrackId(category.tracks[0].id);
    } else {
      setCurrentTrackId(null);
    }
  };

  const handleRateSelect = (rate: number) => {
    setPlaybackRate(rate);
  };

  const handleSeek = (event: MouseEvent<HTMLButtonElement>) => {
    const sound = howlRef.current;
    if (!sound) {
      return;
    }
    const duration = sound.duration();
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const percent = Math.min(Math.max(offsetX / rect.width, 0), 1);
    const newTime = percent * duration;
    sound.seek(newTime);
    setElapsedSeconds(newTime);
    setProgressPercent(percent * 100);
  };

  const trackCount = currentCategory?.tracks.length ?? 0;

  const shouldShowPlayerBar = (isPlaying || isLoading) && Boolean(currentTrack);

  return (
    <section className="space-y-8 pb-28 lg:pb-32">
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-gray-100 p-6 shadow-sm dark:border-gray-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-md">
              {currentCategory?.title
                ? currentCategory.title
                    .split(" ")
                    .slice(0, 3)
                    .map(word => word[0])
                    .join("")
                : "RAD"}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Current book
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                {currentCategory?.title ?? "Select a collection"}
              </h2>
              {currentCategory?.author ? (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                  by {currentCategory.author}
                </p>
              ) : null}
              {currentCategory?.description ? (
                <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-gray-200">
                  {currentCategory.description}
                </p>
              ) : (
                <p className="mt-4 text-base text-gray-500 dark:text-gray-400">
                  Pick a book category to unlock its playlist of recordings.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-300">
            <span className="rounded-full border border-gray-200 px-4 py-1 dark:border-gray-700">
              {trackCount} chapters
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  category.id === selectedCategoryId
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-gray-300 text-gray-600 hover:border-black hover:text-black dark:border-gray-700 dark:text-gray-300"
                }`}
                onClick={() => handleCategoryChange(category.id)}
              >
                {category.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-slate-900">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Session notes
            </p>
            <p className="mt-2 text-2xl font-semibold text-black dark:text-white">
              {currentTrack?.title ?? "Pick a chapter"}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {isPlaying
                ? "Audio is currently streaming. Scroll freely while the mini player floats at the bottom."
                : "Select any chapter in the list to start playback – the player will appear once audio begins."}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-slate-800/50 dark:text-gray-300">
            <p className="font-semibold text-gray-800 dark:text-white">Tips</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Click any chapter tile to instantly jump there.</li>
              <li>The floating player shows once playback starts.</li>
              <li>
                Speed choices and scrubbing controls live inside the floating
                player.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              Chapters
            </p>
            <h3 className="text-2xl font-semibold text-black dark:text-white">
              Listen directory
            </h3>
          </div>
          <span className="rounded-full border border-gray-200 px-4 py-1 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300">
            {trackCount} total
          </span>
        </div>

        {currentCategory?.tracks?.length ? (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {currentCategory.tracks.map((track, index) => {
              const isActive = track.id === currentTrack?.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleTrackSelect(track.id)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? "border-black bg-black text-white shadow-lg shadow-black/10 dark:border-white dark:bg-white dark:text-black"
                      : "border-gray-200 text-gray-700 hover:border-black hover:text-black dark:border-gray-800 dark:text-gray-200"
                  }`}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {String(index + 1).padStart(3, "0")}
                    </span>
                    <span className="mt-1 text-sm font-semibold leading-snug">
                      {track.title}
                    </span>
                  </div>
                  <div className="ml-4 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    {isActive ? "Now" : (track.duration ?? "")}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Select a category to see its chapters.
          </p>
        )}
      </div>
      {shouldShowPlayerBar && currentTrack ? (
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-2xl shadow-black/10 backdrop-blur dark:border-gray-700 dark:bg-slate-900/90">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Now playing
                </p>
                <p className="mt-1 text-lg font-semibold text-black dark:text-white">
                  {currentTrack.title}
                </p>
                {currentCategory?.title ? (
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {currentCategory.title}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Speed
                </span>
                {playbackSpeedOptions.map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleRateSelect(rate)}
                    className={`rounded-full border px-3 py-1 transition-colors ${
                      playbackRate === rate
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-gray-300 text-gray-600 hover:border-black hover:text-black dark:border-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {rate.toFixed(2).replace(/\.00$/, "")}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex-1">
                <button
                  type="button"
                  onClick={handleSeek}
                  className="group relative flex h-2.5 w-full items-center rounded-full bg-gray-200 transition focus:outline-none focus:ring-2 focus:ring-black dark:bg-gray-700 dark:focus:ring-white"
                  aria-label="Seek through current track"
                >
                  <div
                    className="h-2.5 rounded-full bg-black transition-[width] duration-300 group-hover:bg-slate-800 dark:bg-white dark:group-hover:bg-gray-200"
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </button>
                <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatDuration(elapsedSeconds)}</span>
                  <span>{formatDuration(durationSeconds)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:border-black hover:text-black disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                  disabled={!getAdjacentTrackId("prev")}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={handlePlayPause}
                  disabled={isLoading}
                  className="rounded-full bg-black px-6 py-2 text-base font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-400 dark:bg-white dark:text-black"
                >
                  {isLoading ? "Loading..." : isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:border-black hover:text-black disabled:opacity-40 dark:border-gray-700 dark:text-gray-200"
                  disabled={!getAdjacentTrackId("next")}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default RadioPlayer;
