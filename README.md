# PDF Page Extractor

A small, static web app that extracts selected pages from a PDF entirely in the browser. No PDF is uploaded to a server.

# Published Web App
https://kuanw3nch3n.github.io/pdf-page-extractor/


## MVP features

- Choose or drag and drop a PDF.
- Enter individual pages and inclusive ranges, such as `1, 2:5, 45`.
- Validate the selection against the PDF's page count.
- Preserve the requested order, including repeated pages.
- Download the extracted pages as a new PDF.
- Process files locally with [`pdf-lib`](https://github.com/Hopding/pdf-lib).
- Deploy as a static site on GitHub Pages.

## Run locally

No build step is required. Serve the folder with any static web server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Opening `index.html` directly may also work, but using a local server more closely matches GitHub Pages.

## Deploy with GitHub Pages

1. Create a GitHub repository and push this directory to its default branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the default branch and the `/ (root)` folder, then save.

GitHub will display the public site URL after deployment finishes.

## Constraints

- The browser must hold the source PDF and generated PDF in memory. Files around 100–200 MB can require several times their size in free memory and may fail on memory-constrained devices.
- Password-protected or encrypted PDFs are not supported in this MVP.
- The app loads `pdf-lib` 1.17.1 from jsDelivr, so the first visit requires internet access. To support offline use, download and serve the library from this repository instead.
- GitHub Pages is public static hosting. PDF contents remain local, but the app's source code is public unless a Pages-capable private-repository plan is used.

## Project structure

```text
.
├── index.html   # App markup and pinned pdf-lib browser build
├── styles.css   # Responsive presentation
├── app.js       # File loading, range parsing, extraction, and download
└── README.md    # Usage, deployment, and constraints
```
