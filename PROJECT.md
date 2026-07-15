# Annika's Closet

> **Status as of 2026-07-15:** Phases 1 and 2 are complete and verified. The app works end to end, for free, at `localhost:3000`. Version one is pushed to https://github.com/DawsonConlon/annika-closet. Next up is Phase 3 (deploy to Vercel), but the more valuable next step is testing on real photos of real clothes. Jump to [Where Things Stand](#where-things-stand) for the handoff details.

## The Problem

Annika owns clothes she likes. Despite this, getting dressed is a chore, because the only way to find out whether an outfit works is to physically put it on. That means undressing, dressing, looking in a mirror, deciding no, and starting over. The cost of evaluating one outfit is high enough that most of her wardrobe never gets evaluated at all. She wears the small set of combinations she already knows work, and the rest of the closet sits unused.

The real problem is not that she lacks clothes or lacks taste. It is that trying something on is slow, and slow feedback kills exploration.

## The Solution

A web app that answers "how would this look on me" without her taking off what she is wearing.

She uploads one photo of herself. She uploads a photo of a piece of clothing. The app shows her a picture of herself wearing it. Evaluating an outfit drops from several minutes to a few seconds, which is the entire point: cheap feedback means she will actually explore the closet she already owns.

## How It Works

The app does not do any image processing itself. It is a courier.

1. Annika uploads a photo of herself and a photo of a garment.
2. The app sends both images to IDM-VTON, a virtual try on model published as a public Hugging Face Space.
3. The model returns a new image of her wearing the garment.
4. The app displays it.

That is the whole system. The hard part, understanding what a body is and how fabric falls on it, is the model's job. Our job is everything around it: making the upload pleasant, making it fast on a phone, and keeping her closet somewhere she does not have to rebuild it every time.

This is worth internalizing early, because it explains most of the decisions below. We are building a user interface, not a machine learning system.

## Technical Decisions

### Try on engine: IDM VTON on a free Hugging Face Space

The model takes the body photo and the garment photo and returns a composite in roughly twenty five seconds. No API key, no infrastructure, no cost.

**This decision was reversed once.** The original plan was Google's Gemini image model, chosen on the assumption that its free tier would cover testing. It does not. Google's free tier reports a hard quota of zero for every image model, so generating a single image requires attaching a credit card. The cost would have been trivial, roughly four cents per try on, but the requirement was a free option, so the engine changed.

What was considered and rejected:

- **Gemini image models.** Good general purpose editing, but image generation is billing gated. Roughly four cents per image once a card is attached.
- **Pollinations.** Advertises a free image editing model called kontext. Its live model list contains only a text to image model, so the documentation is stale and editing is not actually available.
- **Hugging Face Inference Providers.** Ten cents of free credit per month, about two try ons. Pay as you go after that.
- **Dedicated try on services** such as FASHN or Google's Vertex Virtual Try On. Better fabric fidelity, but priced per image and generally one garment at a time.

IDM VTON wins because it is free, needs no account, and is purpose built for exactly this task rather than being a general image model asked nicely. Being purpose built shows: it preserves the face and background almost perfectly.

Known risks, in order of likelihood:

- **It is a research demo, not a product.** It can queue, throttle, or go offline. The Space name lives in an environment variable so an alternate (CatVTON, OOTDiffusion) can be swapped in without code changes.
- **Upper body bias.** Trained mainly on tops. Shirts and dresses work. Shoes and full outfits will not.
- **It needs a findable person.** The pose detector fails on unclear photos, which the app surfaces as a plain language message rather than an error.
- **Privacy.** Photos go to a third party GPU space run by an independent researcher, with no privacy policy behind it. This was a deliberate, accepted tradeoff for a free personal app, made with the alternative (a few dollars to Google, with contractual terms) fully on the table.

### Stack: Next.js, TypeScript, Tailwind

Because the try on happens on someone else's GPU, our backend is a thin relay of about fifty lines. That removes the usual reason to reach for Python, which is that it is the language with the machine learning libraries. There is no model to run locally, so that advantage does not exist here.

What remains is roughly ninety percent user interface, so the stack should be chosen for interface quality. Python's options are weak here. Streamlit and Gradio build fast but look like internal data tools, re-run the whole script on every interaction, and treat mobile as an afterthought. Flask with templates gives full control of the HTML, but every interactive piece, the drag and drop upload, the preview before sending, the spinner that survives a twenty second render, the swipe between results on a phone, gets hand written in vanilla JavaScript. The JavaScript gets written either way. The only question is whether it gets written with tooling or without.

Next.js gives one codebase for both the interface and the API route, the try on Space has a first class JavaScript client, phone first layout is the default rather than a fight, and it deploys free to Vercel.

If we ever self host the try on model rather than calling a hosted one, Python comes back into play for that service specifically. That exit ramp stays open.

### Access: private link, photos persist

Deployed to a Vercel URL that only the two of us have. No login screen. Her body photo and her closet are saved server side so she uploads once rather than every session, which is the difference between a tool she uses and a demo she tried once.

The tradeoff is honest: anyone holding the link can open the app. Given that this stores photos of her body, that deserves a second look before we ship. Adding a single shared password is a small amount of work and is the obvious upgrade if the open link feels wrong once it is real.

### v1 scope: one garment, one body photo

She uploads a body photo, uploads or picks one garment, sees the result.

This is deliberately smaller than the actual problem, which is full outfits. The reason is that the entire project rests on one unproven assumption: that the generated image looks enough like her that she trusts it. If that fails, closet management and outfit builders are wasted work. One garment is the shortest path to finding out.

## Build Order

**Phase 1: Frontend with mocked results.** The full interface, wired to placeholder images instead of a real API. Establishes what the app feels like to use and gets you oriented in React before any API keys exist.

**Phase 2: Backend.** Done. The try on call behind a real API route, verified end to end in a browser. Test target is your own photo and your own clothes, so the quality question gets answered before she ever sees it.

**Phase 3: Deploy.** Push to Vercel, get the private link, hand it over.

Phases 4 and beyond stay unscoped on purpose. Full outfits, a persistent closet with categories, and saved looks are all obvious next steps, but which one matters depends on what she actually complains about first.

## Where Things Stand

Everything below is written for whoever picks this up next, human or AI, with no memory of how it got here.

### What is done

Phases 1 and 2 are complete. The app runs locally, accepts two photos, produces a real try on image, and displays it. This was verified by driving an actual headless browser through the whole flow, not by unit tests: upload both photos, tap the button, wait for the result to render, confirm zero console errors. It took about twenty five seconds and cost nothing.

Version one is committed and pushed to https://github.com/DawsonConlon/annika-closet (public, `main` branch). The repo is standalone; it is not part of the parent `claude_code` repo it sits inside.

### The code

Five files matter. Everything else is scaffold.

| File | What it is |
|---|---|
| `frontend/app/page.tsx` | The entire screen. Holds the two photos and the result in React state, calls the API, renders the four result states (idle, generating, done, error). |
| `frontend/components/PhotoSlot.tsx` | One upload card. Used twice, once per photo. Hides a file input behind a tappable card. |
| `frontend/app/api/tryon/route.ts` | The entire backend. Roughly fifty lines. Receives both photos, calls the Space, returns the image as a data URL. |
| `frontend/app/globals.css` | Design tokens (colors, fonts) as Tailwind v4 `@theme` variables. Change a color here, it changes everywhere. |
| `frontend/app/layout.tsx` | Page shell. Loads the two Google Fonts. |

The owner has never written React or TypeScript before. The code is commented accordingly, explaining React concepts where they appear rather than assuming them. Keep that up. Explain, do not just do.

### Running it

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
```

No API key needed. `frontend/.env.local` is gitignored and holds two optional settings, both documented in `frontend/.env.example`: `HF_TOKEN` (a free Hugging Face token that raises the GPU quota) and `TRYON_SPACE` (swap in a different model).

### How the try on call actually works

The Space is a Gradio app, called through `@gradio/client`. Details that are not guessable and cost time to rediscover:

- The endpoint is `/tryon`. Its first parameter is named `dict` and expects `{ background: <person image>, layers: [], composite: null }`, because the Space's UI uses an image editor widget. The garment goes in separately as `garm_img`.
- The JS client option for auth is `token`, **not** `hf_token`. The Python client uses the other name. The types in `node_modules/@gradio/client/dist/types.d.ts` are the source of truth.
- It returns a two item array: `[try on image, masked debug image]`. Each is an object with a `url`. We fetch the first and inline it as base64 so the browser never talks to the Space directly.
- `garment_des` is a text description of the garment. We send a generic string rather than asking the user for one, because the whole design premise is no forms. If garment fidelity disappoints, this is the first knob to turn.
- An `IndexError` from the Space means its pose detector found no person in the photo. This is the most common real failure and is already translated into a plain language message.

### Gotchas in this environment

Learned the hard way. Do not rediscover them.

- **macOS has no `timeout` command.** Poll in a bash loop instead.
- **`chromium-cli` is not installed.** Use Playwright directly: `npx playwright install chromium` first, since no browser is present by default.
- **Playwright resolves modules from the script's location**, not the working directory. Install it next to any driver script, not in the project.
- **Google's free tier reports `limit: 0` for image models.** Confirmed empirically. Do not trust blog posts claiming five hundred free images per day.
- **The Next.js scaffold ships an `AGENTS.md`** warning that this version may differ from training data, with real docs in `node_modules/next/dist/docs/`. Read those before writing Next.js code. In practice the conventions used here were unchanged.

### What to do next

In priority order:

1. **Test on real photos.** This is the open question the whole project rests on and it is now free to answer. Everything else is premature until it is answered.
2. **Phase 3: deploy to Vercel** for the private link. Note the Vercel free tier caps a request at sixty seconds and try ons take about twenty five, so there is headroom but not a lot. If it gets tight, move to polling rather than blocking.
3. **Revisit the privacy call before Annika uses it.** The open link with no password was chosen deliberately, but it was chosen before the app was real. See the Access section above.

## Assumptions I Am Making

Stated openly so they can be corrected rather than discovered later.

- **Body photo.** One full body shot, standing, facing the camera, plain background. This is what these models handle best. Real photos will be messier and we may need to guide her on what works.
- **Garment photos.** Taken flat on a bed or hanging, one item per photo. Photos of clothes already being worn by someone else are a harder case and I am assuming we skip them.
- **Annika is the only user.** No accounts, no multi user support, no one else's closet.
- **You are the tester.** Phase 2 gets validated on your photos, not hers.
- **The output only needs to be good enough to make a decision.** It does not need to be photorealistic. It needs to be right enough that she can tell whether the outfit works.
- **Free is a hard requirement.** Not a preference. This ruled out every paid engine regardless of quality, and is the reason the app depends on a research demo rather than a commercial API.

## Open Question

Is the output actually good enough that she trusts it?

Nothing else in this document matters if the answer is no. This is why Phase 2 tests on you before it ships to her, and why v1 stops at one garment.

Status: the pipeline works end to end and the model preserves face, hair, and background convincingly on test photos. The question is still open on real photos of real clothes, which is the next thing to do.
