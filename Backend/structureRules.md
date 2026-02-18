# Repository Rules & Conventions

This document defines the rules, conventions, and patterns for the **isaii-backend-template** project. All contributions and new features must follow these guidelines.

---

## 1. Tech Stack

| Layer       | Technology |
|------------|-------------|
| Runtime    | Node.js (≥18) |
| Language   | TypeScript (strict mode) |
| Framework  | Express |
| Database   | MongoDB (Mongoose connection; data access via generic repository) |
| Validation | Joi |
| Logging    | Pino + pino-http + pino-pretty |
| Security   | helmet, cors, express-rate-limit, compression |
| Redis      | Optional (in-memory mock when `REDIS_URL` is not set) |

---

## 2. Project Structure

```
src/
├── apis/
│   └── [module-name]/          # e.g. sample, product
│       ├── controller.ts      # Request handlers (class + methods)
│       ├── route.ts            # Express router
│       ├── validation.ts       # Joi schemas
│       └── dto.ts              # TypeScript interfaces for API contracts
├── config/
│   ├── database.ts             # Mongoose connect/disconnect
│   ├── redis.ts                # Redis client or mock
│   └── rateLimit.ts            # apiLimiter, authLimiter
├── middleware/
│   ├── auth.ts                 # authenticate, authorize(...roles), optionalAuth
│   ├── errorHandler.ts         # Central error handler + asyncHandler
│   ├── notFoundHandler.ts      # 404 handler
│   └── httpLogger.ts           # pino-http
├── models/                     # Mongoose models (IInterface + Schema)
├── repository/
│   └── repository.ts           # Generic collection-based CRUD (no table-specific logic)
├── utils/
│   ├── response.ts             # sendResponse / ResponseUtil
│   └── logger.ts               # Pino logger
└── index.ts                    # App entry, routes, DB init, graceful shutdown
```

- Use the **path alias** `@/*` for imports (maps to `src/*`). Example: `import { logger } from '@/utils/logger'`.
- Do **not** add collection-specific or table-specific CRUD in the repository; keep it generic.

---

## 3. API Module Pattern

Each domain (e.g. `sample`) lives under `src/apis/[module-name]/` with four files:

### 3.1 `controller.ts`

- **Class with methods**; each method is a route handler.
- **Wrap every handler** in `asyncHandler` from `@/middleware/errorHandler`.
- Use **`sendResponse`** for all JSON responses (success, created, validationError, notFound, etc.).
- **Validate** request body/query with Joi at the start of the handler; on error, return `sendResponse.validationError(res, error.details[0].message)` and exit.
- Call the **generic repository** by collection name (e.g. `repository.create('samples', value)`), not table-specific methods.
- Map DB documents to API shapes in the controller (e.g. `toSampleDto(doc)`); keep DTOs in `dto.ts`.

### 3.2 `route.ts`

- Express **Router** only.
- Map HTTP methods to controller methods (e.g. `router.get('/', sampleController.list)`).
- Apply `authenticate`, `authorize(...roles)`, or rate limiters (e.g. `authLimiter`) where needed.
- Export the router as **default**.

### 3.3 `validation.ts`

- **Every API endpoint must have a validator.** Define a Joi schema for each route: body (POST/PATCH/PUT), query (GET list), and params (e.g. `:id`).
- **Joi schemas** only (e.g. `createSampleValidation`, `updateSampleValidation`, `listSampleValidation`, `idParamValidation`).
- Use for request body, query, and params validation in the controller; on failure return `sendResponse.validationError(res, error.details[0].message)`.
- For updates, use `.min(1)` so at least one field is provided.
- Reuse shared validators (e.g. `mongoIdValidation` for MongoDB ObjectId in params) across modules.

### 3.4 `dto.ts`

- **TypeScript interfaces** for API request/response (e.g. `CreateSampleDto`, `UpdateSampleDto`, `SampleDto`, `SampleListQuery`).
- No logic; contracts only.

---

## 4. Response Format

All API responses must use the shared payload shapes and **`sendResponse`** from `@/utils/response`.

### 4.1 Success payload

- **Shape:** `{ status: 'success', statusCode, message?, toast?, data?, pagination? }`
- **Helpers:**  
  - `sendResponse.success(res, data?, message?, toast?, pagination?, statusCode?)`  
  - `sendResponse.created(res, data?, message?)` (201)

### 4.2 Failure payload

- **Shape:** `{ status: 'failure', statusCode, message?, toast?, error? }`
- **Helpers:**  
  - `sendResponse.failure(res, statusCode, error?, message?, toast?)`  
  - `sendResponse.notFound(res, error?)` (404)  
  - `sendResponse.validationError(res, error)` (400)  
  - `sendResponse.badRequest(res, error?)` (400)  
  - `sendResponse.unauthorized(res, error?)` (401)  
  - `sendResponse.forbidden(res, error?)` (403)

### 4.3 Pagination (list APIs)

- Use **`generatePagination(totalItems, currentPage, pageSize)`** from `@/utils/response` to build pagination metadata.
- Include it in success responses: `sendResponse.success(res, data, message, undefined, pagination)`.
- Central error handler and rate limiters also respond with **`status: 'failure'** and **`statusCode`** for consistency.

---

## 5. Repository (Generic, Collection-Based)

- **Location:** `src/repository/repository.ts`.
- **No table-specific or collection-specific CRUD.** All operations take a **collection name** (string) and optional filter/update/pagination/aggregation.

### 5.1 Usage rules

- Use the **singleton** `repository` (default Mongoose connection).
- For a different DB/connection, use `Repository.withConnection(connection)`.
- Collection name is always a string (e.g. `'samples'`). Use **`getCollectionName(modelName)`** if you need the default Mongoose collection name from a model name.

### 5.2 Available methods

- **Create:** `create(collection, document)`, `createMany(collection, documents)`
- **Read:** `findById(collection, id, options?)`, `findOne(collection, filter, options?)`, `find(collection, filter, pagination)`
- **Update:** `updateOne(collection, filter, update, options?)`, `updateMany(collection, filter, update)`, `updateById(collection, id, update, options?)`
- **Delete:** `deleteOne(collection, filter)`, `deleteMany(collection, filter)`, `deleteById(collection, id)`
- **Utility:** `count(collection, filter?)`, `aggregate(collection, pipeline)`

### 5.3 Types

- **Filter:** MongoDB query object (`Record<string, unknown>`).
- **Update:** Plain object or update operators (e.g. `$set`, `$inc`). `updateById` wraps non-operator objects in `$set`.
- **PaginationOptions:** `page`, `limit`, `sort` (e.g. `{ createdAt: -1 }`), `projection`.
- **AggregationStage:** Pipeline stage object for `aggregate`.

### 5.4 Efficiency

- `find()` runs **count + find in parallel** (`Promise.all`).
- Use **projection** and **sort** as needed; no collection-specific logic in the repository.

---

## 6. Middleware

### 6.1 Error handling

- **`asyncHandler(fn)`** wraps async route handlers and forwards errors to the central error handler. Use it for every async controller method.
- **`errorHandler`** must be registered **last** (after routes and notFoundHandler). It:
  - Maps known errors (Mongoose CastError/ValidationError, JWT errors, Mongo duplicate key) to status codes and messages.
  - Responds with `{ status: 'failure', statusCode, error }`.
  - Logs 5xx errors at error level, 4xx at warn.
- **`createError(message, statusCode)`** creates operational `AppError` instances for known failure cases.

### 6.2 Not found

- **`notFoundHandler`** runs for unmatched routes and responds with 404 using `sendResponse.notFound`.

### 6.3 Auth (`auth.ts`)

- **`authenticate`:** Requires `Authorization: Bearer <token>`. Sets `req.user` (JwtPayload: `id`, `email`, `role`). Use `AuthRequest` for typed `req`.
- **`authorize(...roles)`:** Use after `authenticate`; returns 403 if `req.user.role` is not in `roles`.
- **`optionalAuth`:** Same as authenticate but does not fail when token is missing or invalid; sets `req.user` when valid.

### 6.4 Logging

- **`httpLogger`** (pino-http) must be applied to the app for request logging.

---

## 7. Models (Mongoose)

- **Location:** `src/models/`.
- Each model file exports:
  - **Interface** (e.g. `ISample`, `ISampleDocument` extending Document).
  - **Schema** with timestamps, `toJSON` transform (strip `__v` and sensitive fields).
  - **Indexes** where needed for query/performance.
  - **Model** (e.g. `Sample`).
- Models define schema and indexes; **actual data access** goes through the **generic repository** using the collection name (e.g. `samples` for model `Sample`).

---

## 8. Config

- **database.ts:** `connectDatabase()`, `disconnectDatabase()` using `MONGODB_URI`.
- **redis.ts:** `getRedisClient()` returns a real Redis client or an in-memory mock when `REDIS_URL` is not set. `closeRedis()` for shutdown.
- **rateLimit.ts:** `apiLimiter` (general API), `authLimiter` (stricter for auth routes). Response body must use `{ status: 'failure', statusCode: 429, error }`.

---

## 9. Entry Point (`src/index.ts`)

- **Order of setup:**  
  - Load env (`dotenv/config`).  
  - Create Express app.  
  - Apply helmet (with CSP), cors (origins from env), body parsers (with configurable limit), compression, morgan, httpLogger.  
  - Apply `apiLimiter` to `/api`.  
  - Mount **health** route: `GET /health` (status, timestamp, uptime, environment).  
  - Mount API routes under `/api/[module]` (e.g. `/api/sample`).  
  - Register **notFoundHandler**, then **errorHandler**.
- **Startup:** `startServer()` must connect to MongoDB, then Redis (or mock), then listen on `PORT`.
- **Graceful shutdown:** On `SIGTERM`/`SIGINT`, close server, disconnect MongoDB, close Redis, then exit. Handle `unhandledRejection`; use a shutdown timeout (e.g. 10s) to force exit if needed.

---

## 10. Environment Variables

- **Required in `env.example` (and documented):**  
  `PORT`, `NODE_ENV`, `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ALLOWED_ORIGINS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_AUTH_WINDOW_MS`, `RATE_LIMIT_AUTH_MAX_REQUESTS`, `BODY_LIMIT`.
- **Sensitive values** must not be committed; use `.env` (gitignored) and copy from `env.example`.

---

## 11. Validation Pattern (Joi)

- **Every API must have a validator:** validate body (POST/PATCH/PUT), query (e.g. list filters/pagination), and params (e.g. `:id`) with Joi before any business logic.
- In the **controller**, validate at the start of each handler:
  ```ts
  const { error, value } = someValidation.validate(req.body);  // or req.query, req.params
  if (error) {
    return sendResponse.validationError(res, error.details[0].message);
  }
  // use value for repository and response
  ```
- For query params that should be numbers, use `validate(req.query, { convert: true })` so Joi coerces strings.
- Keep all Joi schemas in the module’s **`validation.ts`**.

---

## 12. Naming & Code Conventions

- **TypeScript:** Strict mode; use interfaces/types for API contracts and repository usage.
- **Imports:** Prefer `@/` path alias for project modules.
- **Constants:** Collection names and configurable constants in one place (e.g. at top of controller or config).
- **Logging:** Use the shared **logger** from `@/utils/logger` (Pino); no `console.log` in production paths.
- **Async:** Use `async/await`; wrap route handlers with **asyncHandler**.

---

## 13. Adding a New API Module

1. Create folder `src/apis/[module-name]/`.
2. Add **dto.ts** (request/response interfaces).
3. Add **validation.ts** (Joi schemas).
4. Add **controller.ts** (class, asyncHandler-wrapped methods, Joi validate → repository by collection name → sendResponse).
5. Add **route.ts** (Router, map methods; add auth/rate limit if needed).
6. In **`src/index.ts`**, mount the router: `app.use('/api/[module-name]', moduleRoutes)`.
7. If the resource has a Mongoose model, add it under **`src/models/`** and use **`getCollectionName(modelName)`** or the known collection name (e.g. `'samples'`) when calling the repository.
8. Do **not** add new methods to the repository for a specific collection; use the existing generic methods with the collection name and filter/update/pagination/aggregation as needed.

---

## 14. Summary Checklist

- [ ] All API responses use **sendResponse** (success/failure payloads with `status`, `statusCode`).
- [ ] Repository is **generic** (collection name + filter/update/pagination/aggregation); no table-specific CRUD.
- [ ] Controllers use **asyncHandler**, **Joi** validation, and **sendResponse**.
- [ ] New API modules follow the **four-file** pattern (controller, route, validation, dto) and are mounted under `/api/[module-name]`.
- [ ] Errors are handled by the central **errorHandler**; 404 by **notFoundHandler**.
- [ ] Env and security (helmet, cors, rate limit) are configured per **env.example** and **config**.
- [ ] Startup connects DB and Redis (or mock), then listens; shutdown closes server, DB, and Redis gracefully.