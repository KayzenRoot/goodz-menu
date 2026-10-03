import { describe, expect, it } from "vitest";
import type { ServerSupabaseClient } from "@/lib/supabase/auth-session";
import { loadVisibleTenantEntry } from "@/lib/supabase/tenant-entry";

type Table = "organizations" | "establishments" | "branches";
type TestRow = {
  id: string;
  display_name: string;
  status: string;
  organization_id?: string;
  establishment_id?: string;
};
type OrderCall = { column: string; ascending: boolean };
type QueryBuilder = {
  select(columns: string, options?: { count?: "exact" }): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  range(from: number, to: number): Promise<{ data: TestRow[] | null; error: unknown | null; count: number | null }>;
};

function makeClient(
  rows: Record<Table, TestRow[]>,
  options: { failAt?: { table: Table; from: number }; serverRowLimit?: number } = {},
) {
  const orderCalls: Record<Table, OrderCall[][]> = {
    organizations: [],
    establishments: [],
    branches: [],
  };
  const countCalls: Record<Table, Array<"exact" | undefined>> = {
    organizations: [],
    establishments: [],
    branches: [],
  };
  const pageCalls: Record<Table, number[]> = {
    organizations: [],
    establishments: [],
    branches: [],
  };

  const client = {
    from(table: Table) {
      const orders: OrderCall[] = [];
      orderCalls[table].push(orders);
      const builder: QueryBuilder = {
        select(_columns, selectOptions) {
          countCalls[table].push(selectOptions?.count);
          return builder;
        },
        order(column, options) {
          orders.push({ column, ascending: options?.ascending ?? true });
          return builder;
        },
        async range(from, to) {
          pageCalls[table].push(from);
          if (options.failAt?.table === table && options.failAt.from === from) {
            return { data: null, error: new Error("page query failed"), count: rows[table].length };
          }

          const sorted = [...rows[table]].sort((left, right) =>
            left.display_name.localeCompare(right.display_name) || left.id.localeCompare(right.id),
          );
          const end = Math.min(to + 1, from + (options.serverRowLimit ?? Number.MAX_SAFE_INTEGER));
          return { data: sorted.slice(from, end), error: null, count: rows[table].length };
        },
      };
      return builder;
    },
  };

  return { client: client as unknown as ServerSupabaseClient, orderCalls, pageCalls, countCalls };
}

function createHierarchyRows(count: number): Record<Table, TestRow[]> {
  const organizations = Array.from({ length: count }, (_, index) => {
    const suffix = String(index).padStart(4, "0");
    return { id: `org-${suffix}`, display_name: `Organization ${suffix}`, status: "active" };
  });
  const establishments = organizations.map((organization) => ({
    id: `est-${organization.id.slice(4)}`,
    organization_id: organization.id,
    display_name: `Establishment ${organization.id.slice(4)}`,
    status: "active",
  }));
  const branches = establishments.map((establishment) => ({
    id: `branch-${establishment.id.slice(4)}`,
    organization_id: establishment.organization_id,
    establishment_id: establishment.id,
    display_name: `Branch ${establishment.id.slice(4)}`,
    status: "active",
  }));

  return { organizations, establishments, branches };
}

describe("tenant entry hierarchy pagination", () => {
  it("loads all organizations, establishments, and branches beyond one API page", async () => {
    const { client, pageCalls, countCalls } = makeClient(createHierarchyRows(1001), { serverRowLimit: 100 });

    const result = await loadVisibleTenantEntry(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenants).toHaveLength(1001);
    expect(result.tenants[1000]).toMatchObject({
      id: "org-1000",
      establishments: [{ id: "est-1000", branches: [{ id: "branch-1000" }] }],
    });
    expect(pageCalls).toEqual({
      organizations: Array.from({ length: 11 }, (_, index) => index * 100),
      establishments: Array.from({ length: 11 }, (_, index) => index * 100),
      branches: Array.from({ length: 11 }, (_, index) => index * 100),
    });
    expect(countCalls).toEqual({
      organizations: Array.from({ length: 11 }, () => "exact"),
      establishments: Array.from({ length: 11 }, () => "exact"),
      branches: Array.from({ length: 11 }, () => "exact"),
    });
  });

  it("orders every hierarchy query by display name and then stable id", async () => {
    const rows: Record<Table, TestRow[]> = {
      organizations: [
        { id: "org-z", display_name: "Shared", status: "active" },
        { id: "org-a", display_name: "Shared", status: "active" },
      ],
      establishments: [
        { id: "est-z", organization_id: "org-a", display_name: "Shared", status: "active" },
        { id: "est-a", organization_id: "org-a", display_name: "Shared", status: "active" },
      ],
      branches: [
        { id: "branch-z", establishment_id: "est-a", display_name: "Shared", status: "active" },
        { id: "branch-a", establishment_id: "est-a", display_name: "Shared", status: "active" },
      ],
    };
    const { client, orderCalls } = makeClient(rows);

    const result = await loadVisibleTenantEntry(client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tenants.map(({ id }) => id)).toEqual(["org-a", "org-z"]);
    expect(result.tenants[0].establishments.map(({ id }) => id)).toEqual(["est-a", "est-z"]);
    expect(result.tenants[0].establishments[0].branches.map(({ id }) => id)).toEqual(["branch-a", "branch-z"]);
    for (const table of ["organizations", "establishments", "branches"] as const) {
      expect(orderCalls[table]).toEqual([[
        { column: "display_name", ascending: true },
        { column: "id", ascending: true },
      ]]);
    }
  });

  it("fails closed when an intermediate page query fails", async () => {
    const rows = createHierarchyRows(1001);
    const { client, pageCalls } = makeClient(rows, { failAt: { table: "establishments", from: 1000 } });

    const result = await loadVisibleTenantEntry(client);

    expect(result).toEqual({ ok: false });
    expect(pageCalls.establishments).toEqual([0, 1000]);
  });
});
