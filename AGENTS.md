# Repository Agent Instructions

## Data-loading UX

- Use TanStack Query (`useQuery`) for application data loading by default.
- Admin, account, checkout, and other authenticated or interactive pages must render their client shell immediately and load data through `useQuery` from an API route.
- Use `useMutation` for client-side create, update, and delete operations, and invalidate the relevant query keys after success.
- Every query must provide a useful loading state, an error state, and stable query keys. Prefer skeletons that preserve the final layout over blocking spinners.
- Set an appropriate `staleTime` and avoid unnecessary focus refetches when the data does not need real-time freshness.
- Do not block navigation by querying application data directly in Server Components.
- Exception: SEO-sensitive public storefront pages may load data in Server Components for metadata, indexing, and initial HTML. Client-side interactions on those pages may still use TanStack Query.
- Server Components may still perform authorization, redirects, metadata generation, and other server-only work, but interactive application data should be fetched by the client.

## Orders OpenAPI

- Before changing `/api/openapi`, server-to-server order or product imports, API credential handling, or imported inventory behavior, read `.agents/openapi-orders-agent.md` and `docs/openapi-orders.md` completely.
- Preserve the authentication, idempotency, transaction, inventory, error-contract, and documentation invariants recorded in that agent brief.
