# MCP Inspector Development Guide

## Build Commands

- Build all: `npm run build`
- Build client: `npm run build-client`
- Build server: `npm run build-server`
- Development mode: `npm run dev` (use `npm run dev:windows` on Windows)
- Format code: `npm run prettier-fix`
- Client lint: `cd client && npm run lint`

## Testing

- Run all tests: `npm test` (prettier check + client unit tests)
- Run CLI tests: `npm run test-cli`
- Run E2E tests: `npm run test:e2e`
- Run client tests in watch mode: `cd client && npm run test:watch`
- Client uses Jest + React Testing Library for unit tests
- E2E tests use Playwright with Chrome, Firefox, and WebKit
- CLI has custom Node.js integration test suite
- Test files follow `__tests__` directory pattern

## Code Style Guidelines

- Use TypeScript with proper type annotations
- Follow React functional component patterns with hooks
- Use ES modules (import/export) not CommonJS
- Use Prettier for formatting (auto-formatted on commit)
- Follow existing naming conventions:
  - camelCase for variables and functions
  - PascalCase for component names and types
  - kebab-case for file names
- Use async/await for asynchronous operations
- Implement proper error handling with try/catch blocks
- Use Tailwind CSS for styling in the client
- Keep components small and focused on a single responsibility

## Project Organization

The project is organized as a monorepo with workspaces:

- `client/`: React frontend with Vite, TypeScript and Tailwind
- `server/`: Express backend with TypeScript
- `cli/`: Command-line interface for testing and invoking MCP server methods directly
