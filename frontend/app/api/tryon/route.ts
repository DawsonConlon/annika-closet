/*
  The entire backend. The browser POSTs two photos here as form data;
  we forward them to the IDM-VTON model and send the generated try-on
  image back as a data URL the <img> tag can display directly.

  IDM-VTON is a virtual try-on research model published as a public
  Hugging Face Space. Every Gradio Space is automatically callable as
  an API, and this one runs on Hugging Face's free ZeroGPU hardware,
  so try-ons cost nothing. Unlike a general image model, it is trained
  for exactly this job: put this garment on this person.

  This file runs only on the server. In Next.js, any file named
  route.ts under app/api/... becomes an HTTP endpoint; the exported
  POST function handles POST requests to /api/tryon.
*/

import { Client, handle_file } from "@gradio/client";

const SPACE = process.env.TRYON_SPACE ?? "yisol/IDM-VTON";

/*
  The model wants a short description of the garment. We don't ask
  Annika for one (the whole point is no forms), so we send a neutral
  description that works for most items.
*/
const GARMENT_DESCRIPTION = "the clothing item shown";

export async function POST(request: Request) {
  const form = await request.formData();
  const body = form.get("body");
  const garment = form.get("garment");
  if (!(body instanceof File) || !(garment instanceof File)) {
    return Response.json({ error: "Both photos are required." }, { status: 400 });
  }

  try {
    /*
      An HF token is optional but raises the free GPU quota. Without
      one the Space still works, just with tighter rate limits.
    */
    const token = process.env.HF_TOKEN;
    const client = await Client.connect(SPACE, {
      token: token ? (token as `hf_${string}`) : undefined,
    });

    const result = await client.predict("/tryon", {
      /*
        The Space's first input is an image-editor widget. It expects
        an object with the base image plus (unused) mask layers.
      */
      dict: {
        background: handle_file(body),
        layers: [],
        composite: null,
      },
      garm_img: handle_file(garment),
      garment_des: GARMENT_DESCRIPTION,
      is_checked: true, // auto-generate the garment mask
      is_checked_crop: false, // don't auto-crop the person photo
      denoise_steps: 30,
      seed: Math.floor(Math.random() * 1_000_000),
    });

    /*
      The Space returns [try-on image, masked debug image]. Each is an
      object with a url pointing at the file on the Space. We fetch the
      first one and inline it so the browser never talks to the Space
      directly.
    */
    const output = (result.data as Array<{ url?: string }>)[0];
    if (!output?.url) {
      return Response.json(
        { error: "The model didn't return an image. Try again." },
        { status: 502 }
      );
    }

    const imageResponse = await fetch(output.url);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return Response.json({
      image: `data:image/png;base64,${buffer.toString("base64")}`,
    });
  } catch (err) {
    console.error("Try-on failed:", err);
    const raw = err instanceof Error ? err.message : String(err);
    /*
      The most common real failure: the model can't find a person in
      the photo, which surfaces as an IndexError from its pose
      detector. Translate that into something actionable.
    */
    const message = /IndexError|list index/i.test(raw)
      ? "Couldn't find a person in that photo. Try a clear, well-lit photo showing head to knees."
      : /quota|rate|429/i.test(raw)
        ? "The free GPU is busy right now. Wait a minute and try again."
        : raw;
    return Response.json({ error: message }, { status: 502 });
  }
}
