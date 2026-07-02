# CI Publishing: GitHub Pages Site + Chrome Web Store Deploy

_2026-07-01_

Two GitHub Actions workflows that publish the extension's public-facing
information and automate store releases.

## GitHub Pages site (`.github/workflows/pages.yml`)

**Goal:** a public URL for the privacy policy (required by the Chrome Web
Store listing) plus a small landing page.

- Project Pages on this repo, deployed from Actions (no `gh-pages` branch).
- Site source lives in `site/`: `index.md` (landing page: description,
  supported sites, support contact) and `_config.yml` (Primer theme).
- `PRIVACY_POLICY.md` at the repo root stays the single source of truth; the
  workflow copies it into `site/privacy-policy.md` at build time, wrapped in
  Jekyll front matter with permalink `/privacy-policy/`.
- Built with `actions/jekyll-build-pages`, deployed with
  `actions/deploy-pages`.
- Triggers: push to master touching `PRIVACY_POLICY.md`, `site/**`, or the
  workflow itself; manual `workflow_dispatch`.

**URLs:**

- Landing: <https://keithfry.github.io/jd-grab/>
- Privacy policy: <https://keithfry.github.io/jd-grab/privacy-policy/>

## Chrome Web Store deploy (`.github/workflows/chrome-store.yml`)

**Goal:** automatically upload and publish a new store version whenever the
`manifest.json` version number changes on master.

- Trigger: push to master touching `manifest.json` (plus manual
  `workflow_dispatch`, which skips the version check).
- Version-change detection: compare `version` in `HEAD` vs `HEAD^`
  (`fetch-depth: 2`); skip publish when unchanged.
- Build: existing `./build.sh` → `build/jd-grab.zip`.
- Upload/publish: `chrome-webstore-upload-cli@3` with `--auto-publish`
  (submits for Google review; goes live when review passes).

**Required repository secrets** (Settings → Secrets and variables → Actions):

- `CHROME_EXTENSION_ID` — from the CWS dashboard after first manual submission
- `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` — Google
  Cloud OAuth credentials for the Chrome Web Store API; see
  <https://github.com/fregante/chrome-webstore-upload/blob/main/How%20to%20generate%20Google%20API%20keys.md>

**Constraint:** the first store submission must be done manually in the CWS
dashboard (the API can only update an existing item). Until the extension ID
exists and secrets are set, this workflow fails at the upload step — expected.
