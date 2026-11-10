# Travel document extraction dependencies

Travel booking confirmations are parsed in the browser with PDF.js and Tesseract.js. OCR uses the English fast trained data from `@tesseract.js-data/eng`. The source PDF/image is processed locally; the app sends it to the selected Google Drive, Dropbox or Box account only when the user saves the booking with an attachment.

- PDF.js: Apache-2.0
- Tesseract.js and Tesseract.js Core: Apache-2.0
- English trained data: MIT

The app build packages the required worker, core and language files under the same origin so the existing Content Security Policy remains in place. OCR is English-only. PDFs are limited to 10 pages and 25 MB; low quality scans and unusual confirmation layouts may not yield reliable fields. Extracted values are suggestions and remain editable. Missing fields are reported rather than inferred. Separate bookings found on different PDF pages can be reviewed and imported as linked entries; multiple segments printed on a single page may need to be added manually.
