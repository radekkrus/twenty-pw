# CLAUDE.md

Guidance for Claude Code working in this repository. Twenty is an open-source CRM in an Nx monorepo (Yarn 4).

## Commands

```bash
yarn start                                   # frontend + backend + worker
npx nx start twenty-front | twenty-server    # individual packages
npx nx run twenty-server:worker              # background worker

npx nx lint:diff-with-main twenty-front      # ALWAYS prefer this over full lint
npx nx lint:diff-with-main twenty-front --configuration=fix
npx nx typecheck twenty-front | twenty-server
npx nx fmt twenty-front | twenty-server

cd packages/{workspace} && npx jest "pattern"    # single test — fastest
npx nx test twenty-front | twenty-server
npx nx run twenty-server:test:integration:with-db-reset
npx nx storybook:build twenty-front && npx nx storybook:test twenty-front

npx nx build twenty-shared   # must build FIRST, before front/server
npx nx build twenty-front | twenty-server

npx nx database:reset twenty-server
npx nx run twenty-server:database:init:prod
npx nx run twenty-server:database:migrate:prod                     # fast commands only
npx nx run twenty-server:database:migrate:generate --name <n> --type <fast|slow>

npx nx run twenty-front:graphql:generate                           # after ANY schema change
npx nx run twenty-front:graphql:generate --configuration=metadata
```

E2E UI test: click "Continue with Email", credentials are prefilled.

## Dev environment

```bash
bash packages/twenty-utils/setup-dev-env.sh   # --docker | --down | --reset
```

Idempotent. Starts Postgres + Redis (auto-detects local vs Docker), creates databases, copies `.env` files, runs migrations on a fresh DB. **Skip it for read-only tasks** — architecture questions, code review, docs. CI manages services itself and does not use this script.

## Stack

- **Frontend**: React 18, TypeScript, Jotai, Linaria (zero-runtime CSS-in-JS), Vite, Lingui (i18n)
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, GraphQL (Yoga, code-first), BullMQ, ClickHouse for analytics when enabled

```
packages/
  twenty-front/     twenty-server/    twenty-ui/       twenty-shared/
  twenty-emails/    twenty-website/   twenty-docs/     twenty-zapier/
  twenty-e2e-testing/
```

Read-only Postgres MCP in `.mcp.json` — inspect workspace/metadata schemas, verify migration results, debug whether a bug is frontend, backend or data-level. Writes go through the CLI commands above.

## Code rules

- Functional components only · named exports only · types over interfaces (except extending third-party) · string literals over enums (except GraphQL enums) · **no `any`**
- Event handlers over `useEffect` for state updates · props down, events up · composition over inheritance
- **No abbreviations**: `user` not `u`, `fieldMetadata` not `fm`. Generics get descriptive names (`TData`, not `T`)
- camelCase vars/functions · SCREAMING_SNAKE_CASE constants · PascalCase types (props suffixed `Props`) · kebab-case files with suffixes (`.component.tsx`, `.service.ts`, `.entity.ts`, `.dto.ts`, `.module.ts`)
- Components <300 lines, services <500. Components in their own directory with tests and stories. `index.ts` barrel exports. Import order: external → `@/` → relative
- Comments: short-form `//` only, never JSDoc blocks. Explain WHY, not WHAT. Multi-line = multiple `//`
- State: Jotai for global (atoms, selectors, atom families), React hooks for component-local, Apollo for GraphQL cache. Functional updates: `setState(prev => prev + 1)`
- Use `isDefined()` / `isNonEmptyString()` / `isNonEmptyArray()` from `twenty-shared` instead of hand-rolled type guards

## Migrations (instance commands)

Changing an entity file requires a generated instance command. **Fast** = schema changes; **slow** = adds a `runDataMigration` step for data backfills. Workspace commands iterate every active/suspended workspace. Discovery is via the `@RegisteredInstanceCommand` / `@RegisteredWorkspaceCommand` decorators.

- Always include both `up` and `down`
- 🔴 **Never delete or rewrite committed `up`/`down` logic**
- Full docs: `packages/twenty-server/docs/UPGRADE_COMMANDS.md`

## Before finishing a change

1. `lint:diff-with-main` + `typecheck`
2. Relevant tests (prefer single-file runs)
3. Instance command generated for entity changes
4. GraphQL schema changes backward compatible, then `graphql:generate`

## Testing

Test behavior, not implementation. Pyramid: 70% unit / 20% integration / 10% E2E. Query by user-visible text, roles and labels over test IDs. `@testing-library/user-event` for realistic interactions. Names read "should [behavior] when [condition]". `jest.clearAllMocks()` between tests.

## Notes

- Use **Context7** MCP for library/API documentation and setup steps — resolve library IDs and pull docs without waiting to be asked
- Apply security first, then formatting (sanitize before format)
- Config lives in `nx.json`, `tsconfig.base.json`, root `package.json`, and `.cursor/rules/`
