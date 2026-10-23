---
name: go-http-api
description: Go HTTP API services on Fiber v3, fx, zap, GORM/PostgreSQL, Redis, Prometheus and OpenTelemetry. Use when scaffolding a Go API service, adding a resource/endpoint/feature module to one, or changing its middleware, caching, migrations, observability or Bruno collection.
---

# Go HTTP API services

An opinionated stack and layout for Go HTTP APIs. The contract is written first in OpenAPI, and each feature is a self-wiring fx module. Every reference below was verified end-to-end against a running service (Go 1.27, Fiber v3.5, Postgres 18, Redis 8) in October 2026. For general Go topics (concurrency, generics, interfaces, idioms), use `skill://golang-pro`.

## Stack

| Concern | Choice | Reference |
| --- | --- | --- |
| Layout, layers, wiring | feature packages under `internal/`, generated code under `gen/` | [architecture.md](references/architecture.md) |
| Dependency injection | `go.uber.org/fx`: one `Module` per package | [fx.md](references/fx.md) |
| Configuration | `caarlos0/env/v11`, a prefix per module, injectable `config.Source` | [config.md](references/config.md) |
| Logging | `zap`, request-scoped `logger.From(ctx)`, GORM adapter | [logging.md](references/logging.md) |
| HTTP | Fiber v3, sonic JSON, RFC 9457 problems, admin port, graceful drain | [http.md](references/http.md) |
| Contract | OpenAPI 3.0.3, oapi-codegen strict server per tag, kin-openapi validator, keyset cursors, `/v1` | [openapi.md](references/openapi.md) |
| Data | GORM + PostgreSQL 18, UUIDv7, TxManager in ctx, per-feature errors | [database.md](references/database.md) |
| Schema | goose SQL migrations embedded in the binary, `migrate` subcommand (cobra) | [migrations.md](references/migrations.md) |
| Cache, rate limit | go-redis v9, repository decorator, singleflight, fail-open; `redis_rate` GCRA | [redis.md](references/redis.md) |
| Metrics, traces | Prometheus `client_golang`; OpenTelemetry with `autoexport` | [observability.md](references/observability.md) |
| Tests | testify + mockery, testcontainers with a template DB, fxtest + `app.Test` | [testing.md](references/testing.md) |
| Build, lint, format, run | `go tool`, Makefile, golangci-lint v2 (lint, forbidigo stack rules, gofumpt/goimports/golines), distroless Docker, compose | [tooling.md](references/tooling.md) |
| Auth (opt-in) | JWT bearer via JWKS, enforced through spec `security` | [auth.md](references/auth.md) |
| Manual API testing | Bruno collection generated from the spec into `gen/bruno` | [bruno.md](references/bruno.md) |

When you change one concern in an existing service, read that row's reference and follow its rules. Check the invariants below before you finish.

## Invariants

These hold in every service built with this skill. A change that breaks one is wrong even if it compiles. `make lint` enforces the library choices behind them with forbidigo (tooling.md): no mutexes (xsync/atomic), no logger but zap, no JSON but sonic, no `os.Getenv`, no global Prometheus registry, no `AutoMigrate`/`Save`, no UUIDv4, no `time.Sleep`.

1. **Contract first.** `api/openapi.yaml` defines every operation. The validator rejects requests that don't match it before any handler runs, so handlers never re-check shape. Handlers return only the responses the spec declares.
2. **Generated code goes in `gen/` only** (`gen/go/<feature>api`, `gen/go/httpapi`, `gen/go/<feature>mocks`, `gen/bruno`). It is committed and never edited by hand. Run `make generate` after every change to the spec or to an interface.
3. **Features wire themselves.** `internal/<feature>/module.go` provides the repository, service and handler, and registers routes through `httpserver.AsRoutes`. Turning a feature on means adding `<feature>.Module` to `internal/app/app.go`.
4. **Config is per module.** Each module parses its own env prefix from `config.Source`. Nothing calls `os.Getenv`.
5. **Repositories are the only GORM users.** They start every query with `tm.DB(ctx)`. They translate `gorm`/`pgconn` errors into the feature's sentinel errors, matching on named constraints. Services depend on the `Repository` interface they declare themselves, and on `db.Transactor`.
6. **Errors become HTTP responses in exactly two places.** Expected feature errors become typed spec responses in `handler.go`. Everything else becomes a logged 500 in `httpserver.ErrorHandler`. Response bodies never contain internal error text.
7. **Log or return an error, not both.** Inside a request, log through `logger.From(ctx)` so every line carries `request_id` (and `trace_id` when spans are recorded).
8. **Cache only through a repository decorator.** Invalidate with `db.AfterCommit`, bypass the cache inside transactions, and fail open. (Applies when Redis is in scope.)
9. **Metric labels stay bounded.** The route label is the template, never the raw path. No metric uses the global Prometheus registry.
10. **Migrations own the schema.** Never call `AutoMigrate`. IDs are UUIDv7, generated in Go by `db.Base`. Convert timestamps with `.UTC()` at the DTO boundary.
11. **Runnable as documented.** From a fresh clone and a clean shell, every command in the README works as written: `make deps-up migrate-up run` serves the API with no exported variables, and a missing tool, dependency or setting fails with one line naming the fix. A command that needs an undocumented `export` is a bug in the Makefile defaults, not in the docs.

## Scope round

Interviews are timed (often 45 minutes), and some concerns cost build and debugging time while adding little to the discussion. Before writing any code in Workflow A, run one `ask` round with the four questions below in a single call, so the user can skip them explicitly. Each question has exactly these three options; every option's `description` says what it costs and what it buys. Recommend the timed-interview default from the table, except recommend option 0 or 1 for a concern the prompt names (caching or rate limits for Redis, observability, test strategy, deployment).

Always in scope, never asked: the OpenAPI contract and codegen, fx wiring, per-module config, zap, GORM/PostgreSQL, goose migrations, RFC 9457 problems, and the admin port with graceful drain. Auth stays opt-in: include it only if the user asks.

| Question | 0 | 1 | 2 | Timed default |
| --- | --- | --- | --- | --- |
| Redis | Full: cache decorator + rate limiting | Cache only | Skip | 2 |
| Observability | Full: Prometheus + OTel, business metrics/spans where a feature warrants | Platform only: Prometheus + OTel platform code, no business metrics/spans, no Jaeger | Metrics only: no tracing | 1 |
| Tests | Full: testing.md (unit, repository, API via testcontainers) | Service unit tests with mockery only | Smoke `curl`s only | 1 |
| Tooling | Full: lint, Docker image, full compose, Bruno | Lean: lint + dependencies-only compose | Lean + Bruno | 1 |

What each reduced choice leaves out (keep everything else as the references show it):

- **Redis, Skip:** no `redisx/`, `cache/`, `ratelimit/` or their modules in `platform.go`; no `Limiter` field or limiter block in `httpserver`; no `cache.go` or `fx.Decorate(NewCachedRepository)` in features; no `redis` compose service, `REDIS_*` Makefile lines or env rows; no go-redis, `redis_rate`, `redisotel` or testcontainers redis module (the testkit starts only Postgres). **Cache only:** keep `redisx/` and `cache/`; drop `ratelimit/` and the `Limiter` wiring.
- **Observability, Platform only:** Workflow B step 7 adds nothing; no `jaeger` compose service. **Metrics only:** no `otel/` package, `OTEL_*` config or `jaeger` service; replace `otel.Module` in `platform.go` with `fx.Provide(func() trace.TracerProvider { return noop.NewTracerProvider() })` (`go.opentelemetry.io/otel/trace/noop`), so every `trace.TracerProvider` parameter keeps compiling and log lines simply carry no `trace_id`.
- **Tests, Service unit only:** `.mockery.yml`, `make generate-mocks` and service tests against the mocks; no `internal/testkit/`, `main_test.go` (its `TestMain` needs the testkit), testcontainers, repository or API tests, and `make test` drops its `need-docker` prerequisite. **Smoke only:** no test files, no mockery tool, `.mockery.yml`, `generate-mocks` target or `gen/go/<feature>mocks`.
- **Tooling, Lean:** keep `.golangci.yml` (`make lint` and `make fmt` enforce the invariants); `compose.yaml` holds only Postgres (plus Redis if in scope); no Dockerfile, `.dockerignore`, `api`/`migrate`/`jaeger` compose services or `compose-up`/`compose-down`; no Bruno: no `api/bruno/`, `gen/bruno/`, `generate-bruno`, `need-node`, `BRUNO` or `REDOCLY`. **Lean + Bruno:** the same, keeping Bruno.

Record the answers as a `## Scope` table in the service README (concern, choice, what adding it back takes, with the reference to follow). That table is the scope for every later change: Workflow B never adds a skipped concern, and asks again only when the request needs one. The Invariants and the verification gate apply only to concerns in scope. These reduced variants are derived from the full references, not separately verified, so the gate below is what proves them.

## Workflow A: scaffold a new service

Ask for these if they're missing: the module path, the binary name, and the first feature with its operations. Then run the scope round above, and work through the steps in order, leaving out whatever the scope skipped. Each step has a done-condition; don't start the next step until it holds.

1. **Module, tools and Makefile** ([tooling.md](references/tooling.md)): run `go mod init`, then `go mod edit -go=1.27`, then add the `go get -tool` lines for oapi-codegen and mockery (mockery only if tests are in scope). Add the Makefile now; step 3 needs `make generate-api`. With Bruno in scope, Node must be installed: `make generate-bruno` runs pinned tools through `npx`.
   *Done:* `go tool oapi-codegen -version` (and `go tool mockery version`, if in scope) prints a version.
2. **Platform packages.** Create the in-scope packages of `internal/platform/{config,logger,otel,metrics,db,redisx,cache,ratelimit,admin,problem,pagination,httpserver}` and `platform.go`, taking the code from config.md, logging.md, observability.md, database.md, redis.md, http.md and openapi.md (validator and pagination). Leave `auth/` out unless the user asked for auth.
   *Done:* every in-scope package in architecture.md's layout exists. They compile only after step 3 generates `gen/go/httpapi` and adds `api/embed.go`.
3. **Contract** ([openapi.md](references/openapi.md)): write `api/common.yaml`, `api/openapi.yaml` (`servers: /v1`, the first feature's tag), `api/embed.go`, `api/codegen/httpapi.yaml`, one `api/codegen/<feature>.yaml` per tag, and, with Bruno in scope, `api/bruno/environments/local.yml` ([bruno.md](references/bruno.md)).
   *Done:* `make generate-api` (plus `generate-bruno` with Bruno) writes `gen/go/httpapi`, `gen/go/<feature>api` (and `gen/bruno`) without errors.
4. **Entrypoint and schema** ([architecture.md](references/architecture.md), [migrations.md](references/migrations.md)): write `cmd/<binary>/main.go`, `internal/cli/{root,serve,migrate}.go`, `internal/app/app.go`, `migrations/embed.go` and the first migration. Write that migration by hand as `migrations/<YYYYMMDDhhmmss>_create_<things>.sql`: `//go:embed *.sql` doesn't compile with no files, so `make migration` only works once one exists. Then run `go mod tidy`.
   *Done:* `go build ./...` succeeds.
5. **First feature:** follow Workflow B.
6. **Test kit** ([testing.md](references/testing.md)), per the Tests scope: Full writes `internal/testkit/{testkit,main}.go` and `.mockery.yml`; Service unit only writes `.mockery.yml`; Smoke only skips this step. Then run `go mod tidy`.
7. **Tooling** ([tooling.md](references/tooling.md)), per the Tooling scope: `.golangci.yml`, `compose.yaml` and `.gitignore` always; the Dockerfile and `.dockerignore` only for Full. Write the README: a Run section that is exactly `make deps-up`, `make migrate-up`, `make run`, the endpoints, the dev commands that exist (`make generate/fmt/lint/test`), the env var table (config.md), and the `## Scope` table.
8. **Verify:** pass the gate below.

## Workflow B: add a feature, resource or endpoint

To add an endpoint to an existing feature, run steps 1, 2 and 4 to 8 and skip whatever doesn't change. Every step follows the service README's `## Scope` table.

1. **Spec:** add the paths, tagged `<feature>`, plus their schemas. List every error status each operation can return, using the shared responses from `common.yaml`. Give request properties `example`s so the Bruno requests are ready to send ([openapi.md](references/openapi.md)).
2. **Codegen:** for a new feature, copy `api/codegen/<other>.yaml` and change `package`, `output` and `include-tags`. Then run `make generate-api` (plus `generate-bruno` with Bruno).
3. **Migration:** run `make migration name=create_<things>` (a service's first feature already has one from Workflow A step 4). Name every constraint, and give foreign keys no `RESTRICT` ([migrations.md](references/migrations.md)).
4. **Feature package** `internal/<feature>/` ([architecture.md](references/architecture.md), [database.md](references/database.md), [openapi.md](references/openapi.md)):
   - `model.go`: GORM model embedding `db.Base`.
   - `errors.go`: sentinel errors whose messages are safe to show clients.
   - `service.go`: the `Repository` interface, input structs, and `Service` (`WithinTx` for anything that must be atomic).
   - `repository.go`: a GORM implementation with `translate`.
   - `handler.go`: the strict handler, with a `var _ <feature>api.StrictServerInterface = (*Handler)(nil)` check, a `switch` mapping errors to typed responses, a `toDTO` that calls `.UTC()`, and `NewRoutes`.
   - `module.go`: provides the above, plus `fx.Decorate(NewCachedRepository)` if reads are hot and Redis is in scope ([redis.md](references/redis.md)).
5. **Wire it:** add `<feature>.Module` to `internal/app/app.go`. With mocks in scope, add the `Repository` interface to `.mockery.yml`, then run `make generate-mocks`.
6. **Tests** ([testing.md](references/testing.md)), all in `package <feature>_test`, as far as the Tests scope goes (Service unit only writes just the service unit tests; Smoke only writes none):
   - `main_test.go`
   - service unit tests for each rule
   - a repository test for each translated error
   - an API test per operation covering the happy path and its main error
7. **Metrics or spans** for business events, only if the feature needs them and Observability is Full ([observability.md](references/observability.md)).
8. **Verify:** pass the gate below.

## Verification gate

Work is done only when all of these hold, minus the checks for concerns the scope skipped (`make test` with Smoke only; the Bruno part of `make generate` without Bruno):

- `make generate` leaves `git diff -- gen/` limited to the changes you intended. In CI, `make check-generated` passes.
- `make fmt` has been run and `make fmt-check` exits 0 (no diff).
- `make lint` reports `0 issues`.
- `make test` passes. It needs Docker for testcontainers.
- Clean-shell run, after scaffolding or any change to the Makefile, config or startup: in a shell with nothing exported (`env -i HOME="$HOME" PATH="$PATH" bash`), run the README's Run commands verbatim (`make deps-up migrate-up run`). The API must come up. Also start it once with Postgres stopped and confirm the output is a single `startup failed: ...` line. If the default ports are taken, set only `PG_PORT`/`REDIS_PORT`/`HTTP_ADDR`/`ADMIN_ADDR`, plus `COMPOSE_PROJECT_NAME` so you don't touch someone's running stack.
- Smoke test against that running service: `curl` each new or changed operation once on its happy path and once on a 4xx path. Confirm that:
  - 4xx responses are `application/problem+json` with a `request_id`;
  - `curl <ADMIN_ADDR>/metrics` shows the operation's `route` template.
- Drain check, after changes to the server or lifecycle: with `make run` up, send `kill -TERM` to the server process (the pid listening on `HTTP_ADDR`, e.g. `lsof -ti :8080`). For `HTTP_SHUTDOWN_DRAIN_DELAY`, `/readyz` should return 503 `{"status":"shutting_down"}` while the API still answers. After that `make run` should exit 0.
