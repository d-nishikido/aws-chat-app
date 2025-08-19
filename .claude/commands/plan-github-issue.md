---
description: Plan GitHub issue
argument-hint: Issue number
---

Please analyze and plan implementation for the GitHub issue: $ARGUMENTS.

Follow these steps:

1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Plan the necessary changes to fix the issue
5. ALWAYS update the issue $ARGUMENTS as "実装計画" in Japanease.
6. Create a branch on "feature-<issue-number>" and go to that branch

Remenber to use the GitHub CLI (`gh`) for all GitHub-related tasks.