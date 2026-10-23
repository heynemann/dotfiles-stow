# Migrations (goose)

Versioned SQL files embedded in the binary and applied by `delivery migrate up`, run as a separate step (Kubernetes Job / init container, compose `migrate` service) before new pods start. The server never migrates on boot, so replicas never race and a failed migration never takes serving pods down.

`migrations/embed.go`

```go
// Package migrations embeds goose SQL migrations into the binary.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
```

`migrations/20261008120000_create_restaurants.sql`

```sql
-- +goose Up
CREATE TABLE restaurants (
    id         uuid PRIMARY KEY,
    slug       text        NOT NULL CONSTRAINT restaurants_slug_key UNIQUE,
    name       text        NOT NULL,
    cuisine    text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE restaurants;
```

`migrations/20261008120100_create_orders.sql`

```sql
-- +goose Up
CREATE TABLE orders (
    id            uuid PRIMARY KEY,
    restaurant_id uuid        NOT NULL CONSTRAINT orders_restaurant_id_fkey REFERENCES restaurants (id),
    customer_name text        NOT NULL,
    status        text        NOT NULL CONSTRAINT orders_status_check
                              CHECK (status IN ('placed', 'preparing', 'picked_up', 'delivered', 'cancelled')),
    total_cents   bigint      NOT NULL CHECK (total_cents >= 0),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_restaurant_id_idx ON orders (restaurant_id);

CREATE TABLE order_items (
    id               uuid PRIMARY KEY,
    order_id         uuid        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    name             text        NOT NULL,
    quantity         integer     NOT NULL CHECK (quantity > 0),
    unit_price_cents bigint      NOT NULL CHECK (unit_price_cents >= 0),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_id_idx ON order_items (order_id);

-- +goose Down
DROP TABLE order_items;
DROP TABLE orders;
```

## Command

`internal/cli/migrate.go`

```go
package cli

import (
	"database/sql"
	"errors"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib" // database/sql driver "pgx"
	"github.com/pressly/goose/v3"
	"github.com/spf13/cobra"

	"example.com/delivery/internal/platform/config"
	"example.com/delivery/internal/platform/db"
	"example.com/delivery/migrations"
)

func newMigrateCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "migrate", Short: "Apply or inspect database migrations (DB_DSN)"}
	cmd.AddCommand(
		&cobra.Command{
			Use:   "up",
			Short: "Apply all pending migrations",
			RunE: withProvider(func(cmd *cobra.Command, p *goose.Provider) error {
				res, err := p.Up(cmd.Context())
				for _, r := range res {
					fmt.Fprintln(cmd.OutOrStdout(), r)
				}
				return err
			}),
		},
		&cobra.Command{
			Use:   "down",
			Short: "Roll back the latest migration",
			RunE: withProvider(func(cmd *cobra.Command, p *goose.Provider) error {
				res, err := p.Down(cmd.Context())
				if res != nil {
					fmt.Fprintln(cmd.OutOrStdout(), res)
				}
				return err
			}),
		},
		&cobra.Command{
			Use:   "status",
			Short: "Show applied and pending migrations",
			RunE: withProvider(func(cmd *cobra.Command, p *goose.Provider) error {
				sts, err := p.Status(cmd.Context())
				for _, s := range sts {
					fmt.Fprintf(cmd.OutOrStdout(), "%-8s %s\n", s.State, s.Source.Path)
				}
				return err
			}),
		},
		&cobra.Command{
			Use:   "create NAME",
			Short: "Create a new SQL migration in ./migrations",
			Args:  cobra.ExactArgs(1),
			RunE: func(_ *cobra.Command, args []string) error {
				return goose.Create(nil, "migrations", args[0], "sql")
			},
		},
	)
	return cmd
}

func withProvider(
	run func(*cobra.Command, *goose.Provider) error,
) func(*cobra.Command, []string) error {
	return func(cmd *cobra.Command, _ []string) (err error) {
		cfg, err := db.NewConfig(config.FromEnviron())
		if err != nil {
			return err
		}
		sqlDB, err := sql.Open("pgx", cfg.DSN)
		if err != nil {
			return err
		}
		defer func() { err = errors.Join(err, sqlDB.Close()) }()
		p, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.FS)
		if err != nil {
			return err
		}
		return run(cmd, p)
	}
}
```

- `migrate create add_menu_items` (or `make migration name=add_menu_items`) writes `migrations/<timestamp>_add_menu_items.sql`. Timestamps avoid version collisions between branches.
- `migrate status` lists applied/pending; `migrate down` rolls back one.

## Rules

- Never edit a migration that has been applied anywhere; add a new one.
- Every file has `-- +goose Up` and `-- +goose Down`.
- Name every constraint and index explicitly; repositories match on constraint names (database.md).
- Foreign keys without `ON DELETE RESTRICT` (default NO ACTION raises `23503`); use `ON DELETE CASCADE` only for owned children (`order_items`).
- `id uuid PRIMARY KEY` without a default: the application generates UUIDv7.
- Index every foreign key column.
- Large tables: `CREATE INDEX CONCURRENTLY` needs `-- +goose NO TRANSACTION` at the top of the file and nothing else in it.
- Expand/contract for breaking changes: add nullable column → deploy code writing both → backfill → make `NOT NULL` / drop old column in a later migration.
- Tests run the real migrations once per package into a template database (testing.md), so a broken migration fails `make test`.
