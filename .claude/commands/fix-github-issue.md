---
description: Fix GitHub issue
argument-hint: Issue number
---

Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps:

1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
5. Write and run tests to verify the fix(Do not E2E test)
6. Ensure code passes linting and type checking
8. Create a descriptive commit message
9. NEVER delete an issue

Remenber to use the GitHub CLI (`gh`) for all GitHub-related tasks.