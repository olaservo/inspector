# MCP Inspector Roadmap

Timeline is TBD - this preliminary draft is to collect categories of improvements and discuss them with the maintainers group.

Next steps after deciding on what is highest priority would be to set up a simple Project in the repo and reference the exact issues there.

## CLI Mode

We have a few PRs and issues open around these:

- Add configuration parity with UI mode
- Add feature parity with UI mode

We've also discussed separating this out into a dedicated repo, if that would help with maintainability.

## UX Improvements (UI Mode)

- Revisit UI design?
- Add ability to edit/add arbitrary headers
- TODO: Call out any other specific enhancements/bugs that we think are significant

## Automation/General Process Improvements

- Automatic dependency updates with Dependabot (SDK, etc.)
- Automation with Claude Code Github Action:
    - Initial pass at PR review
    - Initial pass at issue triage/labeling
    - Opening PRs for simple bugs
    - Needs references to MCP spec/docs and example tools for testing
- Revisit how we want to label issues and PRs
- Should we be actively taking thumbs up/voting into account for feature requests?
- Playwright tests vs ad-hoc testing - what makes sense to expand here as part of CI vs doing on-demand?

## LLM Integration

We previously decided not to include this, but people are finding it useful in alternative testing apps. Our previous concerns were around maintainability and whether this really belongs in Inspector.

Examples:
- Chat functionality to test MCP features
- Real sampling with an LLM
