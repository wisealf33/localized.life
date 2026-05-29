SaleTrail social preview fallback images live here.

Do not use Codex-generated images as final town/county preview artwork.
Final social preview images should be created separately as branded 1200x630 JPG files and manually added to this folder.

Current lookup order for listing pages:

1. First uploaded listing photo.
2. City/town + state image, such as `peotone-il.jpg`.
3. County image, such as `will-county.jpg`.
4. Sale type fallback, such as `estate-sale.jpg` or `city-wide-sale.jpg`.
5. State fallback, such as `illinois.jpg`, `indiana.jpg`, or `wisconsin.jpg`.
6. Global fallback, `default-saletrail.jpg`, only if that file exists.

If no uploaded photo, city image, county image, type image, state image, or default image exists, listing pages still build and simply omit the OG/Twitter image metadata until an image is provided.

Use 1200x630 JPG images for best Facebook and Twitter/X previews.
City/town image file names should include the state so SaleTrail can grow nationally without collisions between towns that share a name. File names should be lowercase URL segments, matching the app helper:

- Peotone, IL -> `peotone-il.jpg`
- Joliet, IL -> `joliet-il.jpg`
- New Lenox, IL -> `new-lenox-il.jpg`
- Highland, IN -> `highland-in.jpg`
- Will County -> `will-county.jpg`
- Kankakee County -> `kankakee-county.jpg`

Older town-only files such as `peotone.jpg` may remain as transition fallbacks, but new town images should use the `town-state.jpg` pattern.

General fallback image to-do list:

- Estate sales -> `estate-sale.jpg`
- City-wide sales -> `city-wide-sale.jpg`
- Illinois fallback -> `illinois.jpg`
- Indiana fallback -> `indiana.jpg`
- Wisconsin fallback -> `wisconsin.jpg`
