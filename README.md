# AWS API Gateway CRUD REST API

Serverless Framework CRUD API built with AWS Lambda, API Gateway REST API, and DynamoDB.

## Business Case

This implementation models a simple Notes API where users can create, read, update, and delete notes.

## Tech Stack

- Node.js + TypeScript
- Serverless Framework
- AWS Lambda
- Amazon API Gateway (REST API)
- Amazon DynamoDB
- GitHub Actions for CI/CD

## Architecture

- 5 Lambda handlers implement CRUD:
  - `POST /items` -> `createItem`
  - `GET /items` -> `listItems`
  - `GET /items/{id}` -> `getItem`
  - `PUT /items/{id}` -> `updateItem`
  - `DELETE /items/{id}` -> `deleteItem`
- **`POST /auth/token`** (`issueToken`): public endpoint; validates `clientId` / `clientSecret` and returns a self-issued **HS256 JWT**.
- **Lambda TOKEN authorizer** (`authorizer`): verifies that JWT (`iss`, `aud`, signature, expiry) on every `/items` route before invoking the CRUD handler.
- DynamoDB single-table design with primary key `id`.
- Stage-specific resources through `serverless deploy --stage <stage>`:
  - `notes-crud-api-items-dev`
  - `notes-crud-api-items-prod`

## Project Structure

```txt
.
|-- .github/workflows/deploy.yml
|-- serverless.yml
|-- package.json
|-- tsconfig.json
`-- src
    |-- handlers
    |   |-- createItem.ts
    |   |-- listItems.ts
    |   |-- getItem.ts
    |   |-- updateItem.ts
    |   |-- deleteItem.ts
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

2. Call `/items` routes with:

```http
Authorization: Bearer <access_token>
```

Environment variables (required at **deploy** time so they are baked into Lambda configuration):

| Variable | Example | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | 32+ character random string | HS256 signing key |
| `JWT_ISSUER` | `notes-crud-api` | JWT `iss` claim |
| `JWT_AUDIENCE` | `notes-crud-api-clients` | JWT `aud` claim |
| `API_CLIENT_ID` | service client id | Must match `clientId` in token request |
| `API_CLIENT_SECRET` | long random secret | Must match `clientSecret` in token request |
| `JWT_EXPIRES_IN` | (optional) `3600` | Lifetime in seconds (60–604800); default `3600` if unset |

Locally before `serverless deploy`:

```bash
export JWT_SECRET="...at-least-32-chars..."
export JWT_ISSUER="notes-crud-api"
export JWT_AUDIENCE="notes-crud-api-clients"
export API_CLIENT_ID="your-client-id"
export API_CLIENT_SECRET="your-client-secret"
# optional:
export JWT_EXPIRES_IN="3600"
```

Invalid or missing tokens on protected routes receive `401 Unauthorized` from API Gateway.

## Prerequisites

- Node.js 22+
- AWS account
- AWS credentials configured locally (for manual deploys)
- Serverless Framework CLI (installed via npm in this project)
- Values for `JWT_*` and `API_CLIENT_*` (see table above)

## Install

```bash
npm install
```

## Local Validation

Run type checks:

```bash
npm run build
```

Package/deploy manually (with JWT and client credential env vars set):

```bash
npm run deploy:dev
npm run deploy:prod
```

## API Contract

Use **`POST /auth/token`** first to obtain `access_token`. Every `/items` request below must include `Authorization: Bearer <JWT>` unless noted otherwise.

### Create item

`POST /items`

Request body:

```json
{
  "title": "first note",
  "content": "hello world"
}
```

Response `201`:

```json
{
  "message": "Item created.",
  "data": {
    "id": "uuid",
    "title": "first note",
    "content": "hello world",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### List items

`GET /items`

### Get item

`GET /items/{id}`

### Update item

`PUT /items/{id}`

Request body:

```json
{
  "title": "updated title",
  "content": "updated content"
}
```

### Delete item

`DELETE /items/{id}`

## CI/CD

Pipeline file: `.github/workflows/deploy.yml`

Trigger:

- Push to `master`

Jobs:

1. `test-and-build`: install dependencies and run `npm run build`.
2. `deploy-dev`: deploy stack to `dev` stage.
3. `deploy-prod`: deploy stack to `prod` stage after successful `dev`.

Required GitHub repository secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `JWT_SECRET` (32+ characters)
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `API_CLIENT_ID`
- `API_CLIENT_SECRET`
- `JWT_EXPIRES_IN` (optional; omit or set empty to use default 3600 seconds in Lambda code—if you set this secret in GitHub, use a numeric string)

### CI/CD Evidence

Add screenshots here after running the workflow:

- `docs/screenshots/workflow-success.png`
- `docs/screenshots/dev-deploy.png`
- `docs/screenshots/prod-deploy.png`

## Notes

- CRUD is implemented through Lambda handlers only (no API Gateway service proxy integration to DynamoDB).
- Infrastructure is fully defined in `serverless.yml`.

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