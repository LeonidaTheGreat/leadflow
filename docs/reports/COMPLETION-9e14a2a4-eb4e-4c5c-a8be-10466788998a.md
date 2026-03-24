# Completion Report: genome-phase1e-cicd

**Task ID:** 9e14a2a4-eb4e-4c5c-a8be-10466788998a  
**Task:** GitHub Actions CI/CD for openclaw-genome  
**Status:** ✅ Complete  
**Date:** 2025-07-31

## Summary

Set up GitHub Actions CI/CD for the `LeonidaTheGreat/openclaw-genome` repo and updated `atomic-restart.sh` to run tests before restarting services.

## Deliverables

### 1. `.github/workflows/ci.yml` (new)
- **Trigger:** `push` to `main`, all `pull_request` events
- **Steps:**
  1. Checkout → Setup Node 20 → `npm install`
  2. Syntax validation: `node -c` on every `core/*.js` file
  3. `npm test` (runs jest via `--testPathPatterns=tests/`)

### 2. `.github/workflows/deploy.yml` (new)
- **Trigger:** `push` to `main` only
- **Steps:**
  1. Repeat CI steps (syntax check + jest) as gate
  2. SSH to `stojanadmins-mac-mini.tail3ca16c.ts.net` as `clawdbot`
  3. `git pull origin main`
  4. `bash ~/.openclaw/genome/scripts/atomic-restart.sh`
- **Requires:** `DEPLOY_SSH_KEY` secret in GitHub repo settings (see Setup Required below)

### 3. `scripts/atomic-restart.sh` (updated)
- Added test gate before service restart:
  ```bash
  cd $HOME/.openclaw/genome && npx jest --silent
  # Aborts if tests fail — services keep running previous good code
  ```

## Files Changed (in openclaw-genome repo)
- **Created:** `.github/workflows/ci.yml`
- **Created:** `.github/workflows/deploy.yml`
- **Created:** `scripts/atomic-restart.sh` (was untracked, now committed)

## Commit
- **Repo:** `LeonidaTheGreat/openclaw-genome`
- **Branch:** `main`
- **Commit:** `f72cb80` — pushed to GitHub

## Setup Required (post-deploy)

For `deploy.yml` to work, the `DEPLOY_SSH_KEY` secret must be added to the GitHub repo:

1. Generate a deploy key (if not already done):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/genome_deploy_key -N ""
   ```
2. Add `~/.ssh/genome_deploy_key.pub` to the Mac Mini's `~/.ssh/authorized_keys`
3. Add `~/.ssh/genome_deploy_key` (private key) to GitHub:
   - Repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `DEPLOY_SSH_KEY`
4. Ensure the Mac Mini is reachable on Tailscale from GitHub Actions runner
   - May require a self-hosted runner or Tailscale GitHub Action for Tailscale connectivity

## Verification
- Workflows appear in GitHub at: https://github.com/LeonidaTheGreat/openclaw-genome/actions
- CI will trigger on the next PR or push to main
- Deploy will run after CI passes on main pushes (once `DEPLOY_SSH_KEY` is configured)
