"use client";

/*
  One upload slot: a big tappable card that opens the phone's photo
  picker, then shows the chosen photo in place. The page uses this
  twice, once for "You" and once for "The outfit".

  "use client" at the top means this component runs in the browser.
  It needs to, because it reacts to taps and holds state (the chosen
  photo). Files without this line run on the server in Next.js.
*/

import { useRef } from "react";

type PhotoSlotProps = {
  label: string;
  hint: string;
  /* An object URL for the chosen image, or null when empty. */
  photo: string | null;
  /*
    Hands back both the preview URL (for display) and the File itself
    (so the page can upload it to the backend later).
  */
  onPhotoChosen: (objectUrl: string, file: File) => void;
  icon: React.ReactNode;
};

export default function PhotoSlot({
  label,
  hint,
  photo,
  onPhotoChosen,
  icon,
}: PhotoSlotProps) {
  /*
    The real file input is invisible; the whole card acts as its
    button. useRef gives us a handle to it so a tap anywhere on the
    card can open the picker.
  */
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    /*
      createObjectURL gives the browser a local address for the file so
      we can display it immediately. Nothing is uploaded anywhere yet.
    */
    onPhotoChosen(URL.createObjectURL(file), file);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-rose/30 bg-white/60 transition-colors duration-200 hover:border-rose/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose"
      aria-label={photo ? `${label}: photo added, tap to change` : `${label}: tap to add a photo`}
    >
      {photo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, next/image can't optimize it */}
          <img
            src={photo}
            alt={label}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Small pill so it's obvious the photo can be swapped. */}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            Tap to change
          </span>
        </>
      ) : (
        <span className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <span className="text-rose transition-transform duration-200 group-hover:scale-110">
            {icon}
          </span>
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-faint">{hint}</span>
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </button>
  );
}
