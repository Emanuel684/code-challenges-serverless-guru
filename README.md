# Coffee shop menu API (Serverless on AWS)

Serverless Framework REST API for a **coffee shop menu**: drinks and food items with price and availability, backed by **Amazon DynamoDB**, secured with a **self-issued JWT** and a **Lambda TOKEN authorizer**.

## Business case

Customers and staff interact with a **menu catalog** (e.g. lattes, pastries): create, list, read, update, and delete menu lines. Each line has a name, description, price, and whether it is currently available.

## Tech stack

- Node.js 22 + TypeScript
- Serverless Framework v4 (built-in bundling; per-function packaging in `serverless.yml`)
- AWS Lambda, API Gateway (REST), DynamoDB
- Vitest for unit / handler tests
- GitHub Actions for CI/CD

## Architecture

- **Service name**: `coffee-shop-api` (stack and default resource prefix).
- **Public**: `POST /auth/token` (`issueToken`) — exchanges `clientId` / `clientSecret` for a short-lived **HS256 JWT**.
- **Protected** (authorizer on every route below):
  - `POST /menu-items` → `createMenuItem`
  - `GET /menu-items` → `listMenuItems`
  - `GET /menu-items/{id}` → `getMenuItem`
  - `PUT /menu-items/{id}` → `updateMenuItem`
  - `DELETE /menu-items/{id}` → `deleteMenuItem`
- **Authorizer**: `authorizer` — Lambda **TOKEN** authorizer; validates `Authorization: Bearer <jwt>`.
- **Data**: single DynamoDB table per stage, partition key `id` (string UUID). Physical table name: `coffee-shop-api-menu-items-<stage>`.

## Project structure

```txt
.
|-- .github/workflows/deploy.yml
|-- serverless.yml          # service, provider, package, composes infra/*.yml
|-- infra/
|   |-- functions.yml       # Lambda + API Gateway HTTP events
|   `-- resources.dynamodb.yml
|-- scripts/
|   |-- deploy.sh           # build + test + serverless deploy (Git Bash)
|   `-- print.sh            # serverless print (validates JWT env vars)
|-- tests/                  # Vitest specs (*.test.ts)
|-- vitest.config.ts
|-- package.json
|-- tsconfig.json
`-- src
    |-- handlers
    |   |-- createMenuItem.ts
    |   |-- listMenuItems.ts
    |   |-- getMenuItem.ts
    |   |-- updateMenuItem.ts
    |   |-- deleteMenuItem.ts
    |   |-- issueToken.ts
    |   `-- authorizer.ts
    `-- lib
        |-- db.ts
        |-- response.ts
        |-- types.ts
        `-- jwtAuth.ts
```

## Authentication (self-issued JWT)

1. Obtain a token (no `Authorization` header on this route):

`POST /auth/token`

Request body:

```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret"
}
```

Response `200`:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

2. Call **`/menu-items`** routes with:

```http
Authorization: Bearer <access_token>
```

### Environment variables (deploy time)

These are injected via `serverless.yml` from your shell or CI secrets:

| Variable | Example | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | 32+ character random string | HS256 signing key |
| `JWT_ISSUER` | `coffee-shop-api` | JWT `iss` claim |
| `JWT_AUDIENCE` | `coffee-shop-clients` | JWT `aud` claim |
| `API_CLIENT_ID` | service client id | Must match `clientId` in token request |
| `API_CLIENT_SECRET` | long random secret | Must match `clientSecret` in token request |
| `JWT_EXPIRES_IN` | (optional) `3600` | Lifetime in seconds (60–604800); default `3600` if unset |

Example exports before deploy:

```bash
export JWT_SECRET="...at-least-32-chars..."
export JWT_ISSUER="coffee-shop-api"
export JWT_AUDIENCE="coffee-shop-clients"
export API_CLIENT_ID="your-client-id"
export API_CLIENT_SECRET="your-client-secret"
# optional:
export JWT_EXPIRES_IN="3600"
```

Invalid or missing tokens on protected routes receive `401 Unauthorized` from API Gateway.

## Prerequisites

- Node.js 22+
- AWS account and credentials for deploys
- Serverless CLI via `npx serverless` / project `devDependencies`

## Install

```bash
npm install
```

## Tests and typecheck

```bash
npm run build
npm test
```

Watch mode: `npm run test:watch`

## Deployment helpers (Bash)

From the repo root (e.g. **Git Bash** on Windows), after exporting JWT + client env vars and AWS credentials:

```bash
chmod +x scripts/deploy.sh scripts/print.sh   # Unix-like shells only
./scripts/print.sh dev                           # resolved CloudFormation template
./scripts/deploy.sh dev                        # build + test + serverless deploy
```

`deploy.sh` runs `npm run build`, `npm test`, then `npx serverless deploy --stage <stage> --region $AWS_REGION` (region defaults to `us-east-1` if unset).

## Manual deploy (npm scripts)

With the same env vars exported (or `source .env` if you maintain one locally):

```bash
npm run deploy:dev
npm run deploy:prod
```

Or:

```bash
npx serverless deploy --stage dev --region us-east-2
npx serverless deploy --stage prod --region us-east-2
```

## API contract (menu items)

Use **`POST /auth/token`** first. Every **`/menu-items`** request must send `Authorization: Bearer <jwt>` unless noted.

### Create menu item

`POST /menu-items`

```json
{
  "name": "Oat Latte",
  "description": "12oz, oat milk",
  "price": 5.25,
  "available": true
}
```

- `name` (string, required), `price` (number ≥ 0, required).
- `description` optional (defaults to empty string).
- `available` optional (defaults to `true`).

### List menu items

`GET /menu-items` — returns all rows (DynamoDB **Scan**; suitable for demos).

### Get menu item

`GET /menu-items/{id}`

### Update menu item

`PUT /menu-items/{id}`

```json
{
  "name": "Oat Latte",
  "description": "16oz",
  "price": 5.75,
  "available": false
}
```

`name`, `price`, `available` are required; `description` defaults to `""` if omitted.

### Delete menu item

`DELETE /menu-items/{id}`

## CI/CD

Pipeline: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

- Triggers: push to `master`, pull requests.
- `test-and-build`: `npm ci`, `npm run build`, **`npm test`**.
- `deploy-dev` / `deploy-prod`: `npx serverless deploy` with AWS + JWT secrets.

Required GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `API_CLIENT_ID`, `API_CLIENT_SECRET`, optional `JWT_EXPIRES_IN`.

### CI/CD evidence

Add screenshots after runs:

- `docs/screenshots/workflow-success.png`
- `docs/screenshots/dev-deploy.png`
- `docs/screenshots/prod-deploy.png`

## Notes

- CRUD uses **Lambda integration only** (no API Gateway DynamoDB proxy).
- Root [`serverless.yml`](serverless.yml) composes [`infra/functions.yml`](infra/functions.yml) and [`infra/resources.dynamodb.yml`](infra/resources.dynamodb.yml).
- **`package.individually`** and `package.patterns` trim deployment artifacts (see `serverless.yml`).
- The Serverless **`service`** name is `coffee-shop-api`, so AWS creates a **new** stack and API compared to an older `notes-crud-api` deployment. Remove the previous stack in CloudFormation when you no longer need it.

## The Challenge

Build a Serverless Framework REST API with AWS API Gateway which supports CRUD functionality (Create, Read, Update, Delete) *don't use service proxy integration directly to DynamoDB from API Gateway

Please use GitHub Actions CI/CD pipeline, AWS CodePipeline, or Serverless Pro CI/CD to handle deployments.

You can take screenshots of the CI/CD setup and include them in the README.

The CI/CD should trigger a deployment based on a git push to the master branch which goes through and deploys the backend Serverless Framework REST API and any other resources e.g. DynamoDB Table(s).

### Requirements

0. All application code must be written using NodeJS, Typescript is acceptable as well

1. All AWS Infrastructure needs to be automated with IAC using [Serverless Framework](https://www.serverless.com)

2. The API Gateway REST API should store data in DynamoDB

3. There should be 4-5 lambdas that include the following CRUD functionality (Create, Read, Update, Delete) *don't use service proxy integration directly to DynamoDB from API Gateway

3. Build the CI/CD pipeline to support multi-stage deployments e.g. dev, prod

4. The template should be fully working and documented

4. A public GitHub repository must be shared with frequent commits

5. A video should be recorded (www.loom.com) of you talking over the application code, IAC, and any additional areas you want to highlight in your solution to demonstrate additional skills

Please spend only what you consider a reasonable amount of time for this.

## Optionally

Please feel free to include any of the following to show additional experience:

1. Make the project fit a specific business case e.g. Coffee Shop APIs vs Notes CRUD directly from AWS docs
2. AWS Lambda packaging
3. Organization of YAML files
4. Bash/other scripts to support deployment
5. Unit tests, integration tests, etc
