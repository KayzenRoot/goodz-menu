// Fail-closed Data API pagination.
//
// The PostgREST default row limit is well below a realistic catalog size, so every read contract
// walks pages explicitly instead of trusting the first response. The helper fails closed: a missing
// count, an inconsistent count between pages, an oversized page or a short final page all return
// null rather than a partial row set that a caller could mistake for the whole tenant.

export const QUERY_PAGE_SIZE = 1000;

export type PageResult<Row> = { data: Row[] | null; error: unknown; count: number | null };

export async function loadAllPages<Row>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<Row>>,
  pageSize = QUERY_PAGE_SIZE,
): Promise<Row[] | null> {
  const rows: Row[] = [];
  let expectedCount: number | undefined;

  for (let from = 0; ; ) {
    const page = await queryPage(from, from + pageSize - 1);
    if (
      page.error !== null
      || !Array.isArray(page.data)
      || page.data.length > pageSize
      || page.count === null
      || !Number.isSafeInteger(page.count)
      || page.count < 0
      || (expectedCount !== undefined && page.count !== expectedCount)
    ) return null;

    expectedCount = page.count;
    if (page.data.length === 0 && rows.length < expectedCount) return null;
    rows.push(...page.data);
    if (rows.length > expectedCount) return null;
    if (rows.length === expectedCount) return rows;

    from += page.data.length;
  }
}