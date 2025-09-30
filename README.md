# Continuous Compliance UI project

> [!WARNING]
> This repository is still very much in development, and not ready for use yet.

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
  "API_URL": "http://localhost:9000"
}
```

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

### Run End-to-End Tests with [Nightwatch](https://nightwatchjs.org/)

```sh
# When using CI, the project must be built first.
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chrome
npm run test:e2e -- --env chrome
# Runs the tests of a specific file
npm run test:e2e -- tests/e2e/example.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```
    
### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
