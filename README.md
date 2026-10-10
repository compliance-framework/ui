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
  "FILTER_COMPONENT_LINKING_ENABLED": false
}
```

`API_URL` is the url to connect to for the CCF API
`LOGIN_BANNER` displays a dismissible notice on the login page when set to a non-empty string.
`LOGIN_BANNER_SEVERITY` controls its styling and can be `info`, `warn`, `error`, or `success`.
`FILTER_COMPONENT_LINKING_ENABLED` shows the UI for linking filters to system components

Developers can override these values at build time with `VITE_LOGIN_BANNER` and
`VITE_LOGIN_BANNER_SEVERITY`. `VITE_LOGIN_BANNER` takes precedence over `config.json`; setting it to
an explicit empty string disables the banner for that build without editing `config.json`.

`FILTER_COMPONENT_LINKING_ENABLED` is a feature flag (default `false`) that shows the UI for linking
filters to system components: the component "Dashboards" drawer on SSP pages and the Components
selector on the filter form. It can be overridden at build time with
`VITE_FILTER_COMPONENT_LINKING_ENABLED=true|false`.

#### In Production

Mount a file called `/app/config.json` with your configuration.

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
