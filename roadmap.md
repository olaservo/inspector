# MCP Inspector Roadmap

This preliminary draft is to collect categories of improvements and discuss them with the maintainers group.

Next steps after deciding on what is highest priority would be to set up a simple Project in the repo and reference the exact issues there.

## CLI Mode

- Configuration parity with UI mode
- Feature parity with UI mode
- Would separating the CLI out into a dedicated repo help with maintainability?

## UX Improvements (UI Mode)

- Not all configs are saved consistently
- Configs file support is inconsistent between modes
- Ability to edit/add arbitrary headers
- Editing long sets of args (or other long values) in the sidebar text boxes is annoying
- Revisit UI design

## Automation/General Process Improvements

- Automatic dependency updates with Dependabot (SDK, etc.)
- Automation with Claude Code Github Action:
    - Initial pass at PR review
    - Initial pass at issue triage/labeling
    - Opening PRs for simple bugs
    - Needs references to MCP spec/docs and example tools for testing.  Examples that could be incorporated into a 'Maintainer Toolkit MCP Server' or something similar:
        - https://github.com/olaservo/mcp-advisor
        - https://github.com/olaservo/mcp-misc/tree/main/example-tools
- Revisit how we want to label issues and PRs
- Should we be actively taking thumbs up/voting into account for feature requests?
- Playwright tests vs ad-hoc testing - what makes sense to expand here as part of CI vs doing testing on-demand?
    - And what can Claude be instructed to do with Playwright, etc?

## LLM Integration

We previously decided not to include this, but people are finding it useful in alternative testing apps. Our previous concerns were around maintainability and whether this really belongs in Inspector.

Examples:
- Chat functionality to test MCP features
- Real sampling with an LLM
