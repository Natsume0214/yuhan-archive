# Optimized media variants

This directory contains optional media variants for the site. The existing files in
`public/cube`, `public/loading`, and `public/showcase` are unchanged.

- `desktop/`: high-quality WebP images with a maximum long edge of 2560px; H.264 MP4 videos using CRF 21.
- `mobile/`: high-quality WebP images with a maximum long edge of 1440px; H.264 MP4 videos using CRF 23 and mobile-sized video dimensions.
- The directory layout mirrors the original asset paths, so switching a resource only requires changing the `media-optimized/<variant>/` prefix and, for raster images, the output extension to `.webp`.
- SVG assets remain in their original locations because they are already compact vector files and do not benefit from raster compression.

The current site source is not changed by this asset-only addition, so the live site
continues to use the original resources until a deliberate switch is made.
