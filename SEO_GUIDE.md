SEO checklist and how-to for interaction.tw (and your Synology sites)

1) Submit sitemap to Google Search Console
- Sign in to Google Search Console (https://search.google.com/search-console)
- Select your property (https://interaction.tw/). If not added, click "Add property" and verify ownership (you mentioned it's already verified).
- In the left menu, open "Sitemaps".
- In "Add a new sitemap" paste: sitemap.xml and click Submit.
- Wait for Google to process. Check status on the same page; if there are errors, click the submitted sitemap row to see details.

Notes: If you added https://chenwei.synology.me/ and https://chenwei.synology.me/mediawiki/ to the sitemap, Google can find them but you should also add them as separate properties in Search Console (recommended) to get detailed reports.

2) Verify structured data (JSON-LD)
- Use Google's Rich Results Test: https://search.google.com/test/rich-results
- Paste your page URL (https://interaction.tw/) and run the test. Fix any warnings/errors.
- Optionally: use the Schema Markup Validator (https://validator.schema.org/) to double-check.

3) Test page performance / Core Web Vitals
- Use Lighthouse in Chrome DevTools or PageSpeed Insights (https://pagespeed.web.dev/) to test https://interaction.tw/
- Focus on LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), and INP/FID.
- If LCP is slow: consider optimizing the hero image (use WebP, smaller dimensions, or CDN). We already preloaded the hero image.
- If CLS > 0.1: ensure images have width/height and avoid inserting large content above fold dynamically.

4) Image optimization (imagemagick example)
- Install imagemagick (Homebrew):
```bash
brew install imagemagick
```
- Convert images to WebP (lossy, good quality):
```bash
magick convert images/IMG_4720.jpg -strip -quality 80 images/IMG_4720.webp
magick convert images/IMG_5377.jpg -strip -quality 80 images/IMG_5377.webp
magick convert images/IMG_5433.jpg -strip -quality 80 images/IMG_5433.webp
```
- Generate AVIF (optional, better compression but larger CPU):
```bash
magick convert images/IMG_4720.jpg -quality 50 images/IMG_4720.avif
```
- After creating WebP/AVIF, add them to srcset, e.g.:
```html
<img src="images/IMG_4720.jpg" srcset="images/IMG_4720.avif 1x, images/IMG_4720.webp 1x, images/IMG_4720.jpg 1x" sizes="(max-width:600px) 100vw, 350px" alt="...">
```

5) Cross-site identity and federation (rel=me)
- We added rel=me links in the head. To fully enable identity verification for some Fediverse or identity services, add reciprocal rel=me on the target profiles where possible.

6) Monitoring and next steps
- After sitemap is submitted, check Search Console for coverage and any indexing errors.
- Every 2–4 weeks, run PageSpeed and Rich Results tests to monitor regressions.

If you want, I can:
- Generate WebP/AVIF variants locally (I will produce command lists and create files in the repo if you allow). 
- Produce a small script to batch-convert all images and update `index.html` srcset automatically.
- Produce a short Lighthouse/CWV report template you can run and paste results into for analysis.

-- End of guide --
