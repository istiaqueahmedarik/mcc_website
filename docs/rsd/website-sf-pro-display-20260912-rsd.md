# Website SF Pro Display

## Authorization and scope
The user requested applying `/home/arik/Downloads/sf-pro-display.zip` to the website. This authorizes replacing the previous Inter default with SF Pro Display. Limit implementation to bundled font assets, root font loading, and shared sans-serif mappings. Preserve code fonts and existing interface behavior.

## Implementation and acceptance
Use `next/font/local` with the archive's actual style and weight variants and `display: swap`. Disable bulk preloading so nine static files are not fetched on every route; browser font matching loads needed faces. Unavailable weights use normal browser matching. Keep system fallbacks for unsupported glyphs. Update the root layout, Tailwind sans family, and trainer typography rule together. Verify lint, production compilation, and generated font CSS. Rollback restores Inter in these three files and removes the added assets.
