# Continuous Compliance UI project

## Project Setup

Install and use NVM:
https://github.com/nvm-sh/nvm

```sh
nvm install 20 && nvm use 20
npm install
```

### Configuration

#### Locally

To configure the running frontend, add a file called `public/config.json` with your configuration.

This file will also be used when running in Docker.

```json
{
  "API_URL": "http://localhost:9000",
  "LOGIN_BANNER": "",
  "LOGIN_BANNER_SEVERITY": "info",
  "FILTER_COMPONENT_LINKING_ENABLED": false,
  "DEMO_FEEDBACK_URL": ""
}
```

`API_URL` is the url to connect to for the CCF API
`LOGIN_BANNER` displays a dismissible notice on the login page when set to a non-empty string.
`LOGIN_BANNER_SEVERITY` controls its styling and can be `info`, `warn`, `error`, or `success`.
`FILTER_COMPONENT_LINKING_ENABLED` shows the UI for linking filters to system components
`DEMO_FEEDBACK_URL` is for the public demo only: when set, a _Feedback_ button posts the visitor's
feedback (with credentials) to this URL, the demo portal's `/api/feedback`. Unset or empty, no button.
It can be overridden at build time with `VITE_DEMO_FEEDBACK_URL`.

Developers can override these values at build time with `VITE_LOGIN_BANNER` and
`VITE_LOGIN_BANNER_SEVERITY`. `VITE_LOGIN_BANNER` takes precedence over `config.json`; setting it to
an explicit empty string disables the banner for that build without editing `config.json`.

`FILTER_COMPONENT_LINKING_ENABLED` is a feature flag (default `false`) that shows the UI for linking
filters to system components: the component "Dashboards" drawer on SSP pages and the Components
selector on the filter form. It can be overridden at build time with
`VITE_FILTER_COMPONENT_LINKING_ENABLED=true|false`.

#### In Production

Mount a file called `/app/config.json` with your configuration.

### Public compliance badges (optional server)

The Vue app and default nginx image remain static. For embeddable badges, run the
optional Node 22 badge service with `npm run badges`, or build the Docker `badges`
target. No additional npm dependencies are needed. The service listens on port
`3001` (`PORT` overrides it) and accepts unauthenticated requests:

```text
GET /badges/compliance.svg?repo=example%2Fproject&branch=main&event_type=push
```

Set these **server-only** environment variables:

- `CCF_BADGE_API_URL`: API origin, e.g. `https://api.example.internal` (no path).
- `CCF_BADGE_API_COOKIE_FILE`: mounted secret file containing the API's authenticated
  `Cookie` header value (`name=value; other=value`), not a browser cookie export.
  Use a dedicated identity with permission to search the intended evidence.
  The file is read on each lookup so credentials can be rotated. Provision and renew
  the session using your deployment's supported authentication flow; this service
  does not create sessions. Prefer HTTPS to the API outside a trusted local network.

Each query-string parameter is an evidence label name and its required value.
Arbitrary label names are supported, including repeated names; all pairs become
equality conditions joined with AND. Supply 1 to 50 pairs, with non-empty names and
values of at most 255 characters, no surrounding whitespace or control characters.
The example's `repo`, `branch`, and `event_type` are labels, not reserved parameters.
No saved evidence filters or mapping file are used.

The server sends authenticated
`POST /api/evidence/search?page=1&limit=50&sortBy=lastSeenAt&sortDirection=desc`
requests with this ad hoc body:

```json
{
  "filter": {
    "scope": {
      "query": {
        "operator": "and",
        "scopes": [
          {
            "condition": {
              "label": "repo",
              "operator": "=",
              "value": "example/project"
            }
          },
          {
            "condition": { "label": "branch", "operator": "=", "value": "main" }
          },
          {
            "condition": {
              "label": "event_type",
              "operator": "=",
              "value": "push"
            }
          }
        ]
      }
    }
  }
}
```

All result pages are read and their evidence `status.state` values are aggregated.
Any `not-satisfied` state produces red; otherwise any `satisfied` state produces green;
empty/unknown results produce grey. Successful GET responses contain an SVG image.
API/authentication failures return `502` (timeouts `504`), never a misleading grey badge.
Responses use `Cache-Control: no-store`; each lookup has a five-second overall timeout
and a sixteen-request concurrency limit (`503` when busy).

This endpoint exposes aggregate compliance for arbitrary label queries over evidence
readable by its service identity. Restrict that identity's access and/or protect the
endpoint at ingress unless all such aggregate results are approved for disclosure.

Route exactly `/badges/compliance.svg` through your ingress/reverse proxy to this
service, leaving other UI paths on nginx. Add TLS and ingress rate limiting before
public exposure. Never put the cookie or these server settings in `public/config.json`,
`VITE_*` variables, source control, or image build arguments.

```markdown
![Compliance](https://ccf.example.internal/badges/compliance.svg?repo=example%2Fproject&branch=main&event_type=push)
```

URL-encode query values, including branch names containing `/`, `+`, `#`, or `&`.
Image proxies must be able to reach this URL: GitHub's image proxy cannot reach
private-network instances. External image proxies may also impose their own caching.
Run the badge service's HTTP integration tests with `npm run test:badges`.

### Compile and Hot-Reload for Development

```sh
# Using Docker
docker-compose up -d

# Running locally
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
