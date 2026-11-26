## Image Converter & Compressor: Bulk WebP, AVIF, JPEG, PNG

**A bulk image converter and compressor: convert images to WebP or AVIF in bulk** and make them smaller. Pay $1 per 1,000 images, and broken links are free.

**Convert and resize images in bulk from their URLs.** Paste image links (product photos, blog images, logos, the image column of another Actor's dataset) and get each one back as **WebP, AVIF, JPEG or PNG**, at the **width and height you want**, with **metadata stripped** and a **download link**. Every row also tells you the **original vs new size and the percent saved**.

Typical result: a 257 KB JPEG photo becomes a **79 KB WebP at 600 px (69% smaller)**, and an 800x600 transparent PNG becomes a **48 KB WebP that keeps its transparency (79% smaller)**.

It runs on [sharp](https://sharp.pixelplumbing.com/) (libvips), the fastest image library for Node.js: no browser, no external API, so it is quick and cheap: **$1 per 1,000 images**.

Use it to:

- **speed up a website or online store**: turn heavy JPEG and PNG product photos into WebP or AVIF for better Core Web Vitals and Google PageSpeed scores,
- **make thumbnails and fixed-size images** for catalogs, marketplaces and feeds (`fit: "cover"` crops to the exact size),
- **prepare images for Shopify, WooCommerce, Amazon or Google Merchant Center** (JPEG on a white background from transparent PNGs),
- **remove EXIF and GPS data** before publishing photos,
- **batch convert old GIF, TIFF and PNG files** to modern formats from Make, Zapier, n8n or the API.

### What data you get

One row per converted image:

| Field | Example | Meaning |
| --- | --- | --- |
| `outputUrl` | `https://api.apify.com/v2/key-value-stores/.../records/4.webp` | Download link of the converted image |
| `key` | `4.webp` | File name in the key-value store (from the original name; repeats get `-2`, `-3`) |
| `url`, `finalUrl` | `https://www.gstatic.com/webp/gallery/4.jpg` | The URL you entered and the one after redirects |
| `fileName` | `4.jpg` | Original file name |
| `inputFormat`, `outputFormat` | `jpeg`, `webp` | Formats before and after |
| `inputWidth`, `inputHeight` | `1024`, `772` | Original size in pixels (after applying the EXIF rotation) |
| `outputWidth`, `outputHeight` | `600`, `452` | New size in pixels |
| `inputBytes`, `outputBytes` | `257056`, `78976` | File sizes |
| `savedBytes`, `savedPercent` | `178080`, `69.3` | Space saved (negative if the new file is larger) |
| `contentType` | `image/webp` | MIME type of the new file |
| `frames`, `outputFrames` | `15`, `15` | Frames in an animated GIF/WebP and in the result |
| `hasAlpha` | `true` | The original has transparency |
| `metadataKept` | `false` | Whether EXIF, GPS and XMP were kept |

The converted files are in the run's key-value store (Output tab, **Converted files**), or in a named store if you set one.

### How to use it

1. Paste image URLs in **Image URLs** (up to 10,000 per run).
2. Pick **Convert to** (WebP is the best default) and, if you want, a **width** and/or **height** and the **fit**.
3. Run it, then download the files from the links or the key-value store, or export the table to JSON, CSV or Excel.

Example input:

```json
{
    "urls": [
        "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
        "https://www.gstatic.com/webp/gallery/4.jpg"
    ],
    "format": "webp",
    "width": 600,
    "quality": 80
}
```

Example output item:

```json
{
    "url": "https://www.gstatic.com/webp/gallery/4.jpg",
    "fileName": "4.jpg",
    "outputUrl": "https://api.apify.com/v2/key-value-stores/STORE_ID/records/4.webp",
    "key": "4.webp",
    "inputFormat": "jpeg",
    "inputWidth": 1024,
    "inputHeight": 772,
    "inputBytes": 257056,
    "outputFormat": "webp",
    "outputWidth": 600,
    "outputHeight": 452,
    "outputBytes": 78976,
    "savedBytes": 178080,
    "savedPercent": 69.3,
    "contentType": "image/webp",
    "hasAlpha": false,
    "metadataKept": false
}
```

### Options

| Option | Default | What it does |
| --- | --- | --- |
| **Convert to** | WebP | WebP, AVIF, JPEG, PNG, or the same format as the original |
| **Width / Height** | original | Target size in pixels; set one to keep the aspect ratio |
| **Fit** | inside | `inside` (no crop), `cover` (crop to exact size), `contain` (pad to exact size), `fill` (stretch), `outside` |
| **Never enlarge** | on | Small images are not upscaled |
| **Quality** | 80 | 1 to 100; for PNG below 100 a color palette is used (much smaller files) |
| **Lossless** | off | Pixel-perfect WebP or AVIF |
| **Keep metadata** | off | Keep EXIF, GPS, XMP and the color profile |
| **Keep animation** | off | Keep all frames of animated GIF/WebP when the output is WebP or GIF |
| **Background color** | `#ffffff` | Fills transparent areas for JPEG |
| **File name prefix**, **named store** | | Organize the output and keep files after the run's retention period |

### Pricing

You pay per converted image: **$1 per 1,000 images** ($0.001 per image), no start fee. Broken links, web pages, unsupported types, images over the size limits and invalid URLs are **not charged**; they are listed in the `FAILED` record with the reason. Set a maximum cost per run in Apify and the Actor stops cleanly when it is reached.

### How it works and limits

- Input formats: **JPEG, PNG, WebP, AVIF, GIF and TIFF**. SVG and HEIC/HEIF (iPhone) are not supported yet and are reported, not charged.
- Limits per image: **25 MB** and **40 megapixels** by default (both can be raised in Advanced; for very large images give the run more memory).
- **AVIF** is slow and memory-hungry to encode: about 40 MB per output megapixel, one image at a time. At the default 512 MB memory the AVIF output can be up to about 7 megapixels (for example 3000x2300); set a width (most web images are 1600 px or less) or give the run 1 to 2 GB for bigger ones. Images over the budget are reported, not charged. WebP has no such limit.
- EXIF rotation is applied, so phone photos come out the right way up. Colors are converted to sRGB unless you keep the metadata.
- Animated images: by default the first frame becomes a still image; with **Keep animation** a GIF becomes an animated WebP (usually far smaller).
- Polite downloads: at most 2 at the same time from one website. We do not get around a site's blocking: an image that answers 403 or a captcha is reported as failed and not charged.
- Files in your own private Apify key-value stores can be used as input through their record URL; the run's token is sent only to `api.apify.com`.
- Converted files stay in the run's key-value store for your plan's data retention period. Use **Save to a named key-value store** to keep them.
- Only convert images you have the right to use.

### FAQ

**Which format should I choose?** WebP for websites and stores: about 25 to 35% smaller than JPEG at the same quality and supported by every modern browser. AVIF is smaller still but slower to create. JPEG when a platform does not accept WebP.

**Can I make square thumbnails?** Yes: set width and height to the same value and **Fit** to `cover` (crops the center) or `contain` (adds a border).

**Can I use the images from another Actor?** Yes. Pass the image URLs from its dataset, for example the `iconUrl` and screenshot links of the App Store Scraper, or chain the two Actors in an Apify task or integration.

**Why is a file larger after conversion?** It happens when an already well-compressed image is re-encoded without resizing. `savedPercent` shows it as a negative number; try a lower quality or AVIF.

### Related Actors

- [Apple App Store Scraper](https://apify.com/pampa-data/app-store-scraper): app icons and screenshots to convert and resize.
- [SEO On-Page Audit and Meta Tag Checker](https://apify.com/pampa-data/seo-on-page-audit): audit the pages where your images live.
- [Website Tech Stack Detector](https://apify.com/pampa-data/website-tech-stack-detector): see which CDN and image tools a site already uses.
- [Website Popularity Rank Checker](https://apify.com/pampa-data/website-popularity-rank): rank and traffic trend of the sites you work on.
