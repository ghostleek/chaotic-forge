# Quality gates

Every product change is reviewed against the same minimum gate before it is merged:

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Independent adversarial review of the complete diff
5. A second lint, build, and focused-test run after review fixes

`npm test` runs both layers: Node's built-in test runner exercises the domain, query, schema, reducer, dash experiment, preview-runtime, tester-session, and party-contract modules with native type stripping. Playwright then operates the complete golden flow in desktop and mobile Chrome against the built Vinext Cloudflare Worker: Explore, Returnal and dash reference pages, one-rule adaptation, creator preview, demo publishing, blind tester runs, response, evidence limitations, and decision capture. Run the build gate first; the browser runner deliberately refuses to substitute a development server or reuse an existing server.

PC-01 adds `npm run build:worker` (the same production build gate), `npm run db:generate`, `npm run db:migrate:local`, and `npm run test:party`. Network/storage packets must also pass `test:party` after building. It applies packaged migrations to real local D1, exercises the shared persistence helper through a local-only wrapper around the built Worker, races expected-revision writes, and kills/restarts the Worker before rereading the record. Three isolated browser contexts verify the HTTP boundary. This is local host evidence; deployed access and multiplayer product acceptance remain separate. See [host contract and evidence](./docs/party-forge-host.md).

## Scoped lint exceptions

Several installed UI primitives intentionally use polymorphic rendering or ARIA roles that Oxlint's static JSX rules cannot resolve correctly. The lint configuration disables only the affected rules for the affected generated primitive files:

- `prefer-tag-over-role` for polymorphic grouping, region, separator, and status primitives;
- input-addon pointer interaction rules where clicking decorative content only forwards focus to the already keyboard-accessible input;
- `label-has-associated-control` for a generic label primitive whose association is supplied by consumers;
- `anchor-has-content` for the pagination link whose content is supplied through the Base UI render prop;
- the React compiler effect diagnostic for the carousel adapter's imperative third-party API synchronization.

These exceptions do not exclude any file from linting. Remove an exception when the underlying primitive or linter can express the intended behavior without it, and do not extend an exception to product components.
