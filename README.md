# Annika's Closet

A virtual try-on web app. Upload a photo of yourself and a photo of a piece of clothing, and see yourself wearing it in about twenty seconds.

Built because trying on an outfit is slow. When the only way to find out whether something works is to physically put it on, most of a wardrobe never gets worn. Cheap feedback fixes that.

## Screenshot

The whole app is one screen: two photos, one button, one result.

## How it works

The app does no image processing itself. It is a courier.

1. You upload a photo of yourself and a photo of a garment.
2. The Next.js API route at `app/api/tryon/route.ts` forwards both to [IDM-VTON](https://huggingface.co/spaces/yisol/IDM-VTON), a virtual try-on model published as a public Hugging Face Space.
3. The generated image comes back and is displayed.

IDM-VTON runs on Hugging Face's free ZeroGPU hardware, so try-ons cost nothing. It is purpose-built for this one job: put this garment on this person, and leave the face, pose, and background alone.

## Running it

Requires Node.js.

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

No API key is required. Optionally, copy `frontend/.env.example` to `frontend/.env.local` and add a free [Hugging Face token](https://huggingface.co/settings/tokens) to raise the GPU quota.

## Stack

- **Next.js 16** with TypeScript and Tailwind CSS v4
- **@gradio/client** to call the try-on Space
- Deploys to Vercel

The try-on happens on someone else's GPU, so the backend is a fifty line relay and the app is almost entirely user interface. That is why this is a TypeScript project and not a Python one, despite being an AI app.

## Scope

Version one does one garment on one body photo. That is deliberately smaller than the real problem, which is full outfits, because the whole project rested on one unproven assumption: that the generated image looks enough like you that you trust it. One garment was the shortest path to finding out.

Known limits:

- IDM-VTON is trained mainly on upper body garments. Shirts and dresses work well. Shoes and full outfits do not.
- The person photo needs a clear, findable body. Head to knees, decent lighting, plain background works best.
- The Space is a research demo, not a product. It can be busy or go offline. `TRYON_SPACE` in `.env.local` points at an alternate without code changes.

See [PROJECT.md](PROJECT.md) for the full design reasoning, the decisions that were considered and rejected, and what is still assumed.
