"use client";

/*
  The whole app is this one screen. Three steps stacked vertically:
  add your photo, add the outfit, tap the button, see the result.

  React in one paragraph: a component is a function that returns HTML.
  useState creates a piece of data that, when changed, makes React
  re-draw the screen with the new value. That is the entire trick —
  we never touch the page directly, we change state and React redraws.

  When the button is tapped, the two photos are POSTed to our own
  /api/tryon endpoint (app/api/tryon/route.ts), which forwards them
  to Gemini and returns the generated image.
*/

import { useEffect, useRef, useState } from "react";
import PhotoSlot from "@/components/PhotoSlot";

/*
  Each slot keeps two versions of its photo: an object URL the <img>
  tag can show instantly, and the File itself for uploading.
*/
type ChosenPhoto = { url: string; file: File };

/* The result area is always in one of these four states. */
type ResultState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; image: string }
  | { status: "error"; message: string };

export default function Home() {
  const [bodyPhoto, setBodyPhoto] = useState<ChosenPhoto | null>(null);
  const [garmentPhoto, setGarmentPhoto] = useState<ChosenPhoto | null>(null);
  const [result, setResult] = useState<ResultState>({ status: "idle" });

  const ready = bodyPhoto !== null && garmentPhoto !== null;

  /*
    The result section renders below the fold on a phone, so without
    this a tap on the button looks like nothing happened. Whenever the
    result state changes away from idle, scroll it into view. useEffect
    runs after React has drawn the screen, which is the earliest moment
    the section exists to scroll to.
  */
  const resultRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (result.status !== "idle") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result.status]);

  async function handleTryOn() {
    if (!ready || result.status === "generating") return;
    setResult({ status: "generating" });

    /*
      FormData is the browser's way of packaging files for upload,
      the same format a plain HTML form would send.
    */
    const form = new FormData();
    form.append("body", bodyPhoto.file);
    form.append("garment", garmentPhoto.file);

    try {
      const response = await fetch("/api/tryon", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }
      setResult({ status: "done", image: data.image });
    } catch (err) {
      setResult({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      {/* ---- Title ---- */}
      <header className="text-center">
        <h1 className="font-display text-5xl font-semibold tracking-tight text-rose">
          Annika&apos;s Closet
        </h1>
        <p className="mt-2 text-sm text-faint">
          See it on before you put it on
        </p>
      </header>

      {/* ---- The two photos, side by side ---- */}
      <section className="grid grid-cols-2 gap-4">
        <PhotoSlot
          label="You"
          hint="A full-body photo"
          photo={bodyPhoto?.url ?? null}
          onPhotoChosen={(url, file) => setBodyPhoto({ url, file })}
          icon={<PersonIcon />}
        />
        <PhotoSlot
          label="The outfit"
          hint="One piece, laid flat or hanging"
          photo={garmentPhoto?.url ?? null}
          onPhotoChosen={(url, file) => setGarmentPhoto({ url, file })}
          icon={<HangerIcon />}
        />
      </section>

      {/* ---- The one button ---- */}
      <button
        type="button"
        onClick={handleTryOn}
        disabled={!ready || result.status === "generating"}
        className="w-full cursor-pointer rounded-full bg-rose px-8 py-4 text-lg font-semibold text-white transition-colors duration-200 hover:bg-rose-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose disabled:cursor-default disabled:opacity-40"
      >
        {result.status === "generating" ? "Working on it…" : "Try it on"}
      </button>
      {!ready && (
        <p className="-mt-4 text-center text-xs text-faint">
          Add both photos to try it on
        </p>
      )}

      {/* ---- The result ---- */}
      {result.status !== "idle" && (
        <section
          ref={resultRef}
          className="relative scroll-mt-4 overflow-hidden rounded-2xl border border-petal bg-white/60"
        >
          {result.status === "generating" && (
            /*
              Skeleton shimmer while generating. aria-busy tells
              screen readers this region is loading. Real generation
              takes 10 to 30 seconds, so say so.
            */
            <div
              aria-busy="true"
              aria-label="Creating your try-on"
              className="flex aspect-[3/4] animate-pulse flex-col items-center justify-center gap-3 bg-petal/60"
            >
              <SparkleIcon />
              <p className="text-sm font-medium text-rose">
                Styling your look…
              </p>
              <p className="px-8 text-center text-xs text-faint">
                This takes about twenty seconds
              </p>
            </div>
          )}
          {result.status === "done" && (
            /* eslint-disable-next-line @next/next/no-img-element -- data URL from our API, next/image can't optimize it */
            <img
              src={result.image}
              alt="You, wearing the outfit"
              className="w-full"
            />
          )}
          {result.status === "error" && (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-rose">
                That didn&apos;t work
              </p>
              <p className="text-xs text-faint">{result.message}</p>
              <p className="text-xs text-faint">
                Tap &ldquo;Try it on&rdquo; to try again
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

/*
  Icons are inline SVG rather than emoji so they render identically on
  every phone and inherit the brand color from CSS.
*/
function PersonIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function HangerIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 6.5a2 2 0 1 1 2-2" />
      <path d="M12 6.5v2" />
      <path d="M12 8.5 3.5 14a1.8 1.8 0 0 0 1 3.3h15a1.8 1.8 0 0 0 1-3.3L12 8.5Z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-rose"
      aria-hidden="true"
    >
      <path d="M12 2c.4 3.2 1.3 5.4 2.7 6.8C16 10.2 18.2 11.1 21.5 11.5v1c-3.3.4-5.4 1.3-6.8 2.7-1.4 1.4-2.3 3.6-2.7 6.8h-1c-.4-3.2-1.3-5.4-2.7-6.8-1.4-1.4-3.5-2.3-6.8-2.7v-1C4.8 11.1 7 10.2 8.4 8.8 9.8 7.4 10.7 5.2 11 2h1Z" />
    </svg>
  );
}
