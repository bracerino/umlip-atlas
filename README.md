# uMLIP Atlas

Private, buildless curated reading hub. The deployable site is in `dist/`.

## Content

`dist/papers.json` is the article database. Each entry has a stable ID, exact source title, date and date basis, arXiv ID and recorded version, DOI, type, model families and versions, area tags, a factual summary, the materials / systems it covers, a manual read/unread flag (`read`), source URLs and a last-checked date. Cards show the full source title; the descriptive question beneath it is editorial. To add a paper, copy `paper-template.json` into the `papers` array of `dist/papers.json` and fill it in; sidebar lists, filters and counts derive from the records.

The checked date is 24 October 2026. This is a seed snapshot, not an automated current-literature feed. Publication/first-posting dates are distinguished explicitly. Source-version status does not assert the absence of a later journal version. Reading judgments are AI-prepared and source-based; no claim of independent reproduction is made.

## Behavior

Facets intersect. Date bounds are inclusive. Search matches all space-separated terms across titles, authors, content and tags. The sidebar lists every collection (area tag) and model family with counts; selecting one toggles that filter. Cards lead with the full source title, with the editorial question beneath it. URL hashes preserve filters, sorting and the open paper; browser Back/Forward restores the state. Site audience is enforced by Sites hosting.

## Checking sources

`npm run check` (or `node tools/check-sources.mjs`) queries the arXiv API and Crossref for every record and reports:

- a newer arXiv version than the one recorded in `arxivVersion`;
- a journal DOI or journal reference that the authors added on arXiv;
- for records without a DOI, a Crossref journal/proceedings article whose title matches (a candidate published version);
- DOIs that do not resolve in Crossref, or that carry publisher notices (corrections, retractions).

`npm run check:update` also writes the latest arXiv version, any arXiv-listed DOI and `lastChecked` back into `papers.json`. Crossref title matches are only reported, so review them by hand. Set `CROSSREF_MAILTO` to use Crossref's polite pool.

## Citation counts

`node tools/update-citations.mjs` fetches citation counts from Semantic Scholar (Google Scholar has no API), looking each paper up by DOI and falling back to its arXiv ID; preprint and journal citations are merged. Counts are stored per paper in `papers.json` under `citations`, shown on cards and in the details popup, and available as the "Most cited" sort. With `--if-older-than 3` it does nothing unless the last update is at least 3 days old. `tools/crontab.txt` runs that every 6 hours and at WSL start, so updates happen about every 3 days even if WSL is not always running; install it with `crontab tools/crontab.txt`. Output is logged to `tools/citations.log`. Set `S2_API_KEY` for a personal Semantic Scholar rate limit.

## Validation

Run `npm test` for seed integrity, every facet value, combined facets, date bounds, search, empty states, sorting and deep-link serialization. Browser QA should additionally exercise native dialogs, sidebar filters, navigation history and the responsive layout.
