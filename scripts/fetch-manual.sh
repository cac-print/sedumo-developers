#!/usr/bin/env bash
# CI only: fetches Sedumo's manual with a read-only key (SEDUMO_DOCS_KEY) from the repository and folder the CI
# variables SEDUMO_DOCS_REPO and SEDUMO_DOCS_PATH name, into the runner's temporary folder, and tells the following steps where it is (SEDUMO_DOCS_DIR, read by `npm run
# guides`) and which version it is (SEDUMO_DOCS_VERSION: the manual folder's git tree hash, which changes only when
# the manual does). Without the key it does nothing, unless --required.
set -euo pipefail
[ "${GITHUB_ACTIONS:-}" = true ] || { echo "Runs in GitHub Actions only; locally, set SEDUMO_DOCS_DIR instead" >&2; exit 1; }
if [ -z "${SEDUMO_DOCS_KEY:-}" ]; then
	[ "${1:-}" = --required ] && { echo "SEDUMO_DOCS_KEY is not set" >&2; exit 1; }
	echo "No key to read Sedumo's manual: building without the guides"
	exit 0
fi
key=$(mktemp)
trap 'rm -f "$key"' EXIT
printf '%s\n' "$SEDUMO_DOCS_KEY" > "$key"
chmod 600 "$key"
mkdir -p ~/.ssh
# GitHub's published host key (https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints).
echo 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl' >> ~/.ssh/known_hosts
export GIT_SSH_COMMAND="ssh -i $key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes"
dest="$RUNNER_TEMP/sedumo"
: "${SEDUMO_DOCS_REPO:?set the CI variable SEDUMO_DOCS_REPO}" "${SEDUMO_DOCS_PATH:?set the CI variable SEDUMO_DOCS_PATH}"
git clone --quiet --depth 1 --filter=blob:none --sparse "$SEDUMO_DOCS_REPO" "$dest"
git -C "$dest" sparse-checkout set "$SEDUMO_DOCS_PATH"
version=$(git -C "$dest" rev-parse "HEAD:$SEDUMO_DOCS_PATH")
echo "Sedumo's manual: version $version"
{
	echo "SEDUMO_DOCS_DIR=$dest/$SEDUMO_DOCS_PATH"
	echo "SEDUMO_DOCS_VERSION=$version"
} >> "$GITHUB_ENV"
