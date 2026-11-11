import "server-only";
import { createHash } from "crypto";

/**
 * Builds a signed Bunny Stream embed URL that expires.
 * Enable "Token authentication" + "Allowed domains" in your Bunny library settings.
 */
export function bunnyEmbedUrl(videoId: string, ttlSeconds = 60 * 60 * 3) {
  const lib = process.env.BUNNY_STREAM_LIBRARY_ID;
  const key = process.env.BUNNY_STREAM_TOKEN_KEY;
  if (!lib) return null;
  const params = new URLSearchParams({
    autoplay: "false",
    preload: "true",
    responsive: "true",
  });
  if (key) {
    const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
    const token = createHash("sha256").update(key + videoId + expires).digest("hex");
    params.set("token", token);
    params.set("expires", String(expires));
  }
  return `https://iframe.mediadelivery.net/embed/${lib}/${videoId}?${params.toString()}`;
}
