"use client";

/* eslint-disable @next/next/no-img-element */

import {
  forwardRef,
  useSyncExternalStore,
  type ImgHTMLAttributes,
  type VideoHTMLAttributes,
} from "react";

export type MediaVariant = "desktop" | "mobile";

export const MOBILE_MEDIA_QUERY = "(max-width: 700px)";

const RASTER_EXTENSION = /\.(png|jpe?g|webp|avif|gif)$/i;
const VIDEO_EXTENSION = /\.mp4$/i;

// These two originals share a basename with an existing WebP asset. The
// compressor keeps the source extension in the generated filename to avoid a
// collision, so the mapping must stay explicit.
const OPTIMIZED_FILENAME_OVERRIDES: Record<string, string> = {
  "cube/face-3.png": "cube/face-3.png.webp",
  "cube/face-4.png": "cube/face-4.png.webp",
};

export function getOptimizedMediaPath(source: string, variant: MediaVariant): string {
  if (!source.startsWith("/") || source.startsWith("/media-optimized/")) return source;

  const match = source.match(/^([^?#]*)([?#].*)?$/);
  const sourcePath = match?.[1] ?? source;
  const suffix = match?.[2] ?? "";
  const relativePath = sourcePath.replace(/^\/+/, "");
  const optimizedRelativePath = OPTIMIZED_FILENAME_OVERRIDES[relativePath]
    ?? (RASTER_EXTENSION.test(relativePath) ? relativePath.replace(RASTER_EXTENSION, ".webp") : relativePath);

  if (!RASTER_EXTENSION.test(relativePath) && !VIDEO_EXTENSION.test(relativePath)) {
    return source;
  }

  return "/media-optimized/" + variant + "/" + optimizedRelativePath + suffix;
}

function getOptimizedSrcSet(srcSet: string, variant: MediaVariant): string {
  return srcSet
    .split(",")
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      if (!parts[0]) return "";
      return [getOptimizedMediaPath(parts[0], variant), ...parts.slice(1)].join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

export type ResponsiveImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  /** The original public asset path. It remains in the repository as the source of truth. */
  src: string;
  /** An original-asset srcSet; each candidate is mapped to the selected variant. */
  srcSet?: string;
};

export const ResponsiveImage = forwardRef<HTMLImageElement, ResponsiveImageProps>(function ResponsiveImage(
  { alt = "", src, srcSet, ...imageProps },
  ref,
) {
  const desktopSrc = getOptimizedMediaPath(src, "desktop");
  const mobileSrc = getOptimizedMediaPath(src, "mobile");
  const desktopSrcSet = srcSet ? getOptimizedSrcSet(srcSet, "desktop") : undefined;
  const mobileSrcSet = srcSet ? getOptimizedSrcSet(srcSet, "mobile") : undefined;
  const hasResponsiveRaster = desktopSrc !== src || mobileSrc !== src || Boolean(srcSet);

  if (!hasResponsiveRaster) {
    return <img {...imageProps} ref={ref} src={src} alt={alt} />;
  }

  return (
    <picture style={{ display: "contents" }}>
      <source media={MOBILE_MEDIA_QUERY} srcSet={mobileSrcSet ?? mobileSrc} />
      <img {...imageProps} ref={ref} src={desktopSrc} srcSet={desktopSrcSet} alt={alt} />
    </picture>
  );
});

ResponsiveImage.displayName = "ResponsiveImage";

export type ResponsiveVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "poster"> & {
  /** The original public MP4 path. */
  src: string;
  /** The original poster path, if the video has one. */
  poster?: string;
};

const subscribeToMobileBreakpoint = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
};

const getMobileBreakpointSnapshot = () => window.matchMedia(MOBILE_MEDIA_QUERY).matches;
const getDesktopBreakpointSnapshot = () => false;

export const ResponsiveVideo = forwardRef<HTMLVideoElement, ResponsiveVideoProps>(function ResponsiveVideo(
  { src, poster, children, ...videoProps },
  ref,
) {
  const isMobile = useSyncExternalStore(
    subscribeToMobileBreakpoint,
    getMobileBreakpointSnapshot,
    getDesktopBreakpointSnapshot,
  );
  const desktopSrc = getOptimizedMediaPath(src, "desktop");
  const mobileSrc = getOptimizedMediaPath(src, "mobile");
  const desktopPoster = poster ? getOptimizedMediaPath(poster, "desktop") : undefined;
  const mobilePoster = poster ? getOptimizedMediaPath(poster, "mobile") : undefined;

  return (
    <video {...videoProps} ref={ref} poster={isMobile ? mobilePoster : desktopPoster}>
      <source media={MOBILE_MEDIA_QUERY} src={mobileSrc} type="video/mp4" />
      <source src={desktopSrc} type="video/mp4" />
      {children}
    </video>
  );
});

ResponsiveVideo.displayName = "ResponsiveVideo";
