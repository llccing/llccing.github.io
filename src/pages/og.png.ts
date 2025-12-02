import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@utils/generateOgImages";

export const GET: APIRoute = async () => {
  const imageBuffer = await generateOgImageForSite();
  const body = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  );

  return new Response(body, {
    headers: { "Content-Type": "image/png" },
  });
};
