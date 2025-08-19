Please execute e2e tests using Playwright MCP.
Sub agent: test-specialist, debugger

- Check existing E2E test files
- Start Docker containers for testing
- Run E2E tests using Playwright MCP
  {
    "execute-e2e-test": {
      "command": "npm run docker:test && sleep 10 && npx playwright test --config=playwright.config.ts --reporter=line",
      "description": "Execute E2E tests using MCP Playwright integration"
    }
  }
- Review test results