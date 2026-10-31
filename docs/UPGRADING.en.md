# Upgrade in place

This v0.8 release uses published v0.7 commit `b2a3fffec7ca1a9c29bef7ec38cd77165f32f108` as its baseline. The small patch supports v0.7 and earlier v0.8 candidates; the full package also contains the actual 0.6→0.7→0.8 chain. Application releases and named catalogue workspaces are separate. Updating the application must preserve your existing folder, environment and workspace data.

1. Choose **Stop service & exit** in the old tray menu. Hiding the launcher is insufficient.
2. Extract the small update bundle, or the new complete release, into a temporary location.
3. Run **the new package's `Update_Atlas.cmd`** and select your existing application folder. You can also drag that folder onto the CMD file.
4. The updater validates checksums and local changes, backs up managed application files and applies the included migration chain. It restarts the application from its original path after success.

Do not replace the entire old folder or overwrite its `data` directory. The existing folder name can remain unchanged even when it contains an older version number. `.venv`, named workspaces, favourites, history, settings, secrets, operation counts, media and retained caches remain in place. The v0.7→v0.8 third-party requirements are unchanged, so the updater does not reinstall them. Startup uses uv's inexact synchronization to retain extra packages.

Backups and step events are in `data/updates/<transaction>/`. `data/install_state.json` and `data/update_history.jsonl` record application upgrades outside catalogue workspace management. Changed local code, unapproved paths, symlinks, junctions and payload checksum failures stop the update. Ordinary failures roll back the entire chain; a failed restoration names the remaining paths. Power loss or forced termination cannot guarantee automatic rollback, so keep the backup.

The complete v0.8 package includes actual 0.6→0.7 and 0.7→0.8 steps and their corresponding payloads. It validates and executes the entire chain, then restarts once. The smaller v0.7→v0.8 patch contains only the latter step and cannot update v0.6 directly. Future v0.9 migrations do not exist yet. If a future step changes dependencies, the existing environment is backed up before reconciliation and restored on failure.

```bash
python update.py --target /path/to/existing-atlas --dry-run
python update.py --target /path/to/existing-atlas --restart
```

On macOS/Linux, run `bash Update_Atlas.sh /path/to/existing-atlas`. The updater does not automatically fetch GitHub or install the optional browser helper. See the [Chinese guide](UPGRADING.zh-CN.md) for details.

## Earlier v0.8 candidate → second-review v0.8

The release stays 0.8.0, build `0.8-review2`. Run the new patch’s `Update_Atlas.cmd` against the existing installation. First access repairs known, uncustomized catalogue fields within each workspace after a full SQLite backup under `catalogue_backups/names-20261031-v08-review2.sqlite3`. Favorites, history, settings, counters, aliases, cached resources and `.venv` remain. An existing baseline database, gzip and checksum stay paired; never overwrite your personal data directory.

## Split-fix v0.8 · third review

Build 0.8-review3 supports an in-place update from review 2 and retains personal data. **Reload the existing helper in extension management, then refresh Atlas**; it should report helper 0.8.1. Keep it pointed at the original installation’s browser_helper. See the [review notes](V08_REVIEW3.zh-CN.md).

## Fourth-review split and catalogue update

Build 0.8-review4 includes helper 0.8.2 and supports an in-place update from the previous v0.8 package. Exit the old split first, stop the service, update, reload the helper, and Ctrl+F5 refresh Atlas. Reloading can invalidate old ownership records; unrelated or unrecognized pairs are preserved.
