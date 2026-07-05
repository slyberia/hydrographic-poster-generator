# Vendored Export Fonts

CairoSVG resolves text through system fontconfig; the Google Fonts
`@import` in the rendered SVG works in browser preview only
(docs/PROJECTION_SCALEBAR_NOTES.md §11.3). These TTFs are installed as
system fonts in the backend Docker image so exported text renders with the
correct faces and the §15 text-fit numbers stay valid.

Vendored (small, license-permissive) rather than downloaded at build time
so image builds are hermetic and reproducible.

| File | Family / weight | Used by preset | License |
| :--- | :--- | :--- | :--- |
| `Inter-Regular.ttf` | Inter 400 | gallery_poster subtitle | SIL OFL 1.1 |
| `Inter-Bold.ttf` | Inter 700 | gallery_poster title | SIL OFL 1.1 |
| `RobotoMono-Regular.ttf` | Roboto Mono 400 | technical_atlas subtitle | Apache 2.0 |
| `RobotoMono-Medium.ttf` | Roboto Mono 500 | technical_atlas title | Apache 2.0 |
| `Outfit-Light.ttf` | Outfit 300 | field_plate subtitle | SIL OFL 1.1 |
| `Outfit-SemiBold.ttf` | Outfit 600 | field_plate title | SIL OFL 1.1 |

Source: static instances served by Google Fonts (fonts.gstatic.com),
families `Inter`, `Roboto Mono`, `Outfit`.

Licenses:

- Inter — Copyright The Inter Project Authors, SIL Open Font License 1.1
  (<https://openfontlicense.org>)
- Outfit — Copyright The Outfit Project Authors, SIL Open Font License 1.1
  (<https://openfontlicense.org>)
- Roboto Mono — Copyright Google, Apache License 2.0
  (<https://www.apache.org/licenses/LICENSE-2.0>)

If a typography preset changes fonts, add the new face here and rebuild the
backend image — otherwise CairoSVG silently falls back to a default face.
