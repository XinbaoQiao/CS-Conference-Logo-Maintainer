---
name: conference-logo-maintainer
description: Maintain Better-Poster-Skill CCF conference logo assets. Use when asked to update, audit, repair, or document CCF conference logos under assets/logos, including CCFDDL-based crawling, annual logo refresh checks, manifest/update_list regeneration, and incremental maintenance of conference logo files.
---

# Conference Logo Maintainer

## Scope

Maintain CCF A/B/C conference logo assets in `conference-logo-maintainer/assets/logos`, and keep a copy available for Better-Poster-Skill in `Better-Poster-Skill/assets/logos` when the poster skill needs the assets.
Use the existing crawler at `conference-logo-maintainer/scripts/fetch_ccf_logos.py`; do not rewrite the crawler unless a source or quality issue requires it.

## Workflow

1. Check local instructions and current assets.
   - Run from the workspace root that contains both `conference-logo-maintainer` and `Better-Poster-Skill`.
   - Keep existing hand-collected logo files unless they are clearly false positives.
   - Treat `conference-logo-maintainer/assets/logos` as the maintained source copy.
   - Do not use proxies for CCFDDL, GitHub, or conference-site downloads unless direct access has failed and the user explicitly approves a proxy path.
   - Before crawling, read `conference-logo-maintainer/audit/manual_logo_overrides.json`:
     - conferences absent from the override file continue through the normal CCFDDL crawler;
     - `exact_logo` entries use the configured logo URL/template before local reuse or crawling;
     - `manual_skip` entries stay blank and must not be crawled.

2. Refresh CCFDDL metadata.
   - Scheduled GitHub maintenance uses `.github/workflows/logo-maintenance.yml`:
     - every month on day 1, run `--only-annual-update --refresh-existing` and push changed assets/reports to `scheduled-logo-maintenance`;
     - in January, use the same day-1 branch flow but run a full `--refresh-existing` pass so every logo can be reconsidered once per year;
     - if update changes are pushed and mail settings are configured, send a review reminder to `NOTIFY_EMAIL`;
     - every month on day 10, merge `scheduled-logo-maintenance` into `main` and delete the staging branch;
     - keep the branch model to `main` only outside the review window, and at most `main` plus `scheduled-logo-maintenance` between day 1 and day 10;
     - after each update run, regenerate integrity and focus reports before committing changed assets/reports.
   - Prefer writing a refreshed CCFDDL metadata cache for resumability. Do not pass `--reuse-ccfddl-cache` for scheduled or normal refreshes; the crawler must fetch current CCFDDL YAML so year-based official links and `annual_url_template` values advance from 2026 to 2027, 2028, and so on.

```bash
python conference-logo-maintainer/scripts/fetch_ccf_logos.py \
  --ccfddl-cache-dir /tmp/ccfddl-yaml-cache \
  --timeout 6 --sleep 0.02 --candidate-limit 8
```

   - To refresh the Better-Poster-Skill copy after a successful run:

```bash
rsync -a --delete conference-logo-maintainer/assets/logos/ Better-Poster-Skill/assets/logos/
```

   - If long runs are unstable, run in batches and then merge:

```bash
for off in 0 20 40 60 80 100 120 140 160 180 200 220 240 260 280 300; do
  name=$(printf '%03d' "$off")
  python conference-logo-maintainer/scripts/fetch_ccf_logos.py \
    --offset "$off" --limit 20 \
    --timeout 4 --sleep 0.02 --candidate-limit 6 \
    --ccfddl-cache-dir /tmp/ccfddl-yaml-cache \
    --manifest-name "manifest.batch-${name}.json" \
    --update-list-name "update_list.batch-${name}.md"
done

python conference-logo-maintainer/scripts/fetch_ccf_logos.py \
  --merge-manifest-glob 'conference-logo-maintainer/manifest.batch-*.json'
```

3. Audit results before reporting completion.
   - Verify `conference-logo-maintainer/manifest.json` has 314 CCF A/B/C entries unless CCFDDL changed.
   - Verify every raster in `conference-logo-maintainer/assets/logos` opens with Pillow and every SVG contains `<svg>`.
   - Apply `audit/false_positive_overrides.json` as a hard skip list, not only as a post-run report; confirmed bad mappings should not be downloaded again.
   - Search `source_url` for obvious false-positive terms: `sponsor`, `partner`, `exhibitor`, `slider`, `carousel`, `hero`, `background`, `venue`, `card`, `close.svg`.
   - Visually inspect a contact sheet of all large, extreme-aspect, transparent, or source-suspicious assets before syncing to Better-Poster-Skill.
   - Re-render white/transparent logos on a dark background before deleting them; several valid logos are invisible on white.
   - Remove confirmed false positives and regenerate the manifest, update list, README snapshot, and false-positive overrides together.
   - Regenerate `reports/logo_update_focus_latest.md` after each real refresh. Use its year/place-sensitive table as the next incremental-refresh priority list, and use its white-logo watchlist during visual QA.
   - After sync, compare file names and sha256 hashes between the maintainer and Better-Poster-Skill logo directories; `missing`, `extra`, and `mismatch` must be empty.
   - Run `python scripts/build_site.py --check` after every final manifest change. The public search page must remain buildable from the same `manifest.json` and `assets/logos` without a duplicate catalog.

4. Maintain documents.
   - Keep `conference-logo-maintainer/update_list.md` generated from the manifest.
   - Update `conference-logo-maintainer/README.md` when the workflow, source, status summary, or validation commands change.
   - Keep the README's live-site link, `site/`, and `.github/workflows/pages.yml` aligned when public search behavior or deployment changes.
   - Treat `conference_year` as the latest indexed conference edition, not a proven Logo year. Historical-year retrieval requires an explicit archived asset record; never infer it from `observed_years` or a current filename.
   - Remove `manifest.batch-*.json` and `update_list.batch-*.md` after a successful final merge unless debugging an interrupted run.

## Output Contracts

`conference-logo-maintainer/manifest.json` is the machine-readable source of truth. Each entry should include the conference title, CCF rank, CCFDDL YAML path, latest official link, conference year, local logo file if found, status, hash for local files, and annual update flags.

`conference-logo-maintainer/update_list.md` is the human maintenance checklist. Treat entries in "Need Annual Review" as yearly refresh candidates, and entries in "Missing Or Needs Manual Check" as manual search targets.

When finishing a maintenance run, report:

- Number of CCF entries processed.
- Number of local image files.
- Manifest status summary.
- Number of annual-review and missing/manual-check entries.
- Validation commands run.

## False-Positive Traps

Do not trust a file just because it exists, opens, or has the right acronym in the file name. During visual audit, reject:

- speaker/headshot images and profile photos;
- city, venue, campus, skyline, scenery, or generic hero/background images without conference branding;
- sponsor, publisher, company, university, society, or umbrella-organization marks when they are not the conference's own mark;
- schedule screenshots, ticket/QR images, maps, social icons, and page UI icons;
- conference-series or organization-wide logos reused across distinct conferences unless the manifest explicitly records that reuse as intentional.

Known patterns from the cleanup:

- `ASSETS.png` was a speaker portrait; replace with the reviewed official site icon only when the exception is recorded in the audit script.
- White transparent logos such as AAAI, ECSCW, GLOBECOM, INFOCOM, PPSN, and WCNC look blank on white contact sheets; check them on a dark background.
- EDBT and ICDT intentionally share one joint-event logo, so active logo entries can exceed unique files by one.
- PDFs and other non-image leftovers in `assets/logos` should not survive the final Better-Poster-Skill sync.
- Never use broad acronym prefix matching for local reuse. Examples that must stay separated: `ISPA` vs `ISPASS`, `ICIC` vs `ICICS`, `AsiaCCS` vs `CCS`, and `SoCC` vs `Cloud`.
- When deleting a false-positive reused file, first check whether another manifest entry still correctly references that same file; do not delete shared files blindly.
