# Development recovery and regression workflow

## Preserved state

The branch `backup/pre-regression-protection-20261112` points to `b3a102699eec143d4677def51cd396eba203ca50`. It preserves the development state as found, including known defects. It is not a visually or functionally approved baseline.

## Working safely

Start an isolated branch from the latest development branch; keep changes focused. Open a pull request targeting development. Review the diff and all required checks, including browser failures and their uploaded artifacts. Do not merge if any required check fails or was skipped. Keep production untouched for development-only work. The presence of this document and CI workflow does not enforce branch protection; repository rules must separately require the correct checks and prevent direct pushes.

## Recover application code

1. Record the current development commit, deployment identifiers, affected behaviour, and any relevant screenshots. Preserve ongoing work in its existing branches; do not reset or force-push shared branches.
2. Compare changes and use Git history or `git bisect` in an isolated checkout to identify the offending commit. A successful build alone does not prove a version worked visually or functionally.
3. For an isolated ordinary commit, use `git revert <commit>` on a new fix branch. For a merge commit, inspect its parents and use `git revert -m <parent-number> <merge-commit>` only after determining the correct mainline. Review the resulting diff so later unrelated work is retained.
4. Run the checks and browser tests, review visual differences, and merge the fix only after validation. To recover an individual file, restore it from a verified commit in a fix branch and review its effect on newer work.
5. In Cloudflare Pages, inspect the deployment's commit and environment before selecting an appropriate previous development deployment or deploying the validated fix. A development deployment rollback does not undo a database migration or restore user data. Verify the development preview and keep production unchanged.

## Data and schema

Application Git history and Cloudflare deployments are not backups of Supabase or users' notebooks and attachments. Before schema work, verify an appropriate independent backup and a tested restore procedure. Check migration history and compatibility with both old and new code. Prefer an additive, backwards-compatible corrective migration; do not reverse or delete data blindly. Coordinate any restore with the database operator, verify its recovery point and scope, and test against a separate environment before touching user data. Preserve personal cloud attachments and account data. Never commit credentials, notebook entries, backups or personal files.

## Visual reference

No approved visual baseline has yet been established. Compare candidate reference screenshots against a genuinely working, reviewed version on desktop, iPad portrait and landscape, and mobile. Do not approve screenshots of defective screens or automatically replace references following failures. Investigate and review intentional changes to each affected reference.
