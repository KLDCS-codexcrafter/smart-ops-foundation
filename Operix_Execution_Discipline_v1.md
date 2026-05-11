# Operix Execution Discipline v1 · Lovable Behavioral Locks
## Locked at A.16c Block G.2 · per Q-LOCK-17 v2 resolution

## §1 · Z-evidence regeneration

Lovable execution MUST NOT regenerate `audit_workspace/Z*_close_evidence/*.json`
files unless the sprint Block specs explicitly require Z-evidence regeneration.
Default behavior: Z-evidence files frozen at most recent intentional update.

Verification at Block 0 of future sprints:

```bash
git diff <PREDECESSOR_HEAD>..HEAD audit_workspace/ | wc -l
# Expected: 0 unless sprint touches Z-evidence intentionally
```

If Z-evidence diffs appear unexpectedly · HALT pre-flight per FR-33 and report.
