# uMLIP Atlas source download

This contains the editable source for the private uMLIP Atlas prototype, including all eight seed records, filter/navigation logic, styling, icons and tests.

## Run locally

Unzip and open a terminal in the `umlip-atlas` folder, then run:

```sh
python -m http.server 8000 --directory dist
```

On Windows, `py -m http.server 8000 --directory dist` also works.
Visit http://localhost:8000 in your browser. Use a local server because the application uses JavaScript modules.

## Edit

- `dist/papers.json`: the article database (start from `paper-template.json`).
- `tools/check-sources.mjs`: checks arXiv/Crossref for new versions and published versions (`npm run check`).
- `dist/app.js`: user interface and sidebar.
- `dist/core.js`: filters, search, sorting and deep-link serialization.
- `dist/style.css`: visual styling and responsive layouts.
- `dist/index.html`: page structure and curation information.
- `tests/core.test.mjs`: automated checks; run `npm test` with Node.js installed. No package installation is required.

Deployment credentials, Git history and host-specific project identity are omitted. The ZIP does not change the hosted site's access. If you host the static files elsewhere, configure access control at that host; the page itself does not supply authentication.
