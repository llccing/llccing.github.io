import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@utils/generateOgImages";

export const GET: APIRoute = async () => {
  const imageBuffer = await generateOgImageForSite();
  const body = new Blob([new Uint8Array(imageBuffer)]);

  return new Response(body, {
    headers: { "Content-Type": "image/png" },
  });
};
