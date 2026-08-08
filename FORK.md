# This is a frozen fork of Twenty

Not a contribution fork. Do not open PRs against `twentyhq/twenty` from here, and do not
rebase onto upstream.

| | |
|---|---|
| Forked from | `twentyhq/twenty` |
| Frozen at | tag `twenty/v2.26.0`, commit `b4102946f40b5545cdc371fa7e1a04172d6da5bd` |
| Runs | Partner Wzrostu CRM, `crm.partnerwzrostu.pl` |
| Image | `ghcr.io/radekkrus/twenty-pw`, built by `.github/workflows/build-image.yml` |
| Licence | AGPL-3.0, unchanged from upstream |

## Why this exists

The CRM was built inside Twenty's Apps framework. Every hard limitation we hit came from
that sandbox rather than from Twenty: front components run in a worker with no
`window.open` and no clipboard, apps cannot share code, the host does not hand an app the
ids behind a select-all, unsaved view filters do not survive a reload, Twenty's own record
table is unreachable, and vanilla-extract class hashes move on every build so CSS cannot
target the drawer.

Six of the workarounds were patches rewriting shipped bundles in place, plus a `sed` that
injected a stylesheet into `dist/front/index.html` at container boot. All of them broke on
any image bump. There is no configuration flag that lifts the sandbox, so the sandbox had
to go.

## What "frozen" means

`upstream` is configured as a remote so the history is diffable, but nothing is merged
from it on a schedule. No upgrades, no rebases. The accepted cost is that security patches
do not arrive automatically: the instance has two users, no open registration, no
container ports published outside `127.0.0.1`, and Caddy is the only public listener.
Upstream advisories get reviewed by hand and cherry-picked only if severe.

## Rules

- **Never force-push `main`.** The one exception already happened: the first commit reset
  `main` from upstream's head back to the freeze commit.
- **Never commit a real `.env`.** Secrets live at `/root/<dir>/.env` on the box, mode 600.
  This repository is public.
- **Business logic does not belong here.** The five modules (SMS AI Agent, Spotkania,
  Power Dialer, Cold Email, Statystyki) live in the private `partner-wzrostu-crm`
  repository. This fork is the engine.
- The build target is `twenty` (server + frontend). `twenty-server` omits `dist/front` and
  serves nothing.

## Rollback

The stock image is still on Docker Hub and in the box's local cache:

```bash
TAG=v2.26.0 docker compose up -d server   # with image: twentycrm/twenty
```

Full context: `docs/superpowers/specs/2026-08-08-twenty-fork-design.md` in
`partner-wzrostu-crm`.
