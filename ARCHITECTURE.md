# Backend Architecture & AI Instructions (NestJS)

## Context & Role
This document serves as the absolute source of truth for the architectural decisions of this NestJS backend. 
**For AI Agents:** You MUST read and adhere to these rules before generating, modifying, or suggesting any code. Do not deviate from these patterns unless explicitly instructed by the human developer.

---

## 1. Core Technology Stack
- **Framework:** NestJS (Express under the hood).
- **Database:** PostgreSQL running via Docker Compose (`docker-compose.yml` must be maintained at the root).
- **ORM:** Prisma (`prisma/schema.prisma`).
- **Testing:** Jest (already configured in `package.json`). Use Jest for all unit, integration, and e2e tests.

---

## 2. API Contract & Response Formatting
All incoming requests and outgoing responses must follow a strict, predictable format.

- **Input Validation:** - Strictly use `class-validator` and `class-transformer` within DTOs.
  - A global `ValidationPipe` must be configured in `main.ts` to automatically reject invalid payloads.
  
- **Output Format (Global Interceptors & Filters):**
  - Every HTTP response must adhere to this exact interface:
    ```typescript
    interface ApiResponse<T> {
      success: boolean;
      data?: T;
      error?: string;
    }
    ```
  - **Rule of Mutual Exclusivity:** If `success` is `true`, `data` must be present and `error` must be omitted. If `success` is `false`, `error` must be present and `data` must be omitted.
  - **Implementation:** The AI must implement a Global Response Interceptor for successful requests and a Global Exception Filter for errors (including standard HTTP exceptions and custom domain exceptions) to enforce this structure.

---

## 3. Design Patterns: Pragmatic Clean Architecture
We follow a pragmatic approach to Clean Architecture to balance maintainability and delivery speed.

- **Dependency Injection & Repositories:** - Controllers must not access Prisma directly.
  - Use the Repository Pattern to abstract database operations, but keep it lean. 
  - **CRITICAL:** Use Interfaces for dependency injection (e.g., `IUserRepository`, `IBookingRepository`). The services must depend on the interface, and the NestJS module must provide the Prisma implementation using custom providers. 
  - Avoid over-engineering (e.g., do not create complex base repositories or unnecessary generic abstractions if they don't add immediate value).

---

## 4. Module Structure & Vertical Slices
The codebase is divided into vertical business slices. Code must be placed in the appropriate directory. Do not create circular dependencies.

```text
src/
 ├── common/               # GLOBAL INFRASTRUCTURE
 │   ├── decorators/       # e.g., @CurrentUser()
 │   ├── filters/          # Global Exception Filter (Error formatting)
 │   ├── interceptors/     # Global Response Interceptor (Data formatting)
 │   └── interfaces/       # Shared TS interfaces (e.g., ApiResponse)
 │
 ├── prisma/               # DATABASE MODULE
 │   ├── prisma.module.ts
 │   └── prisma.service.ts
 │
 ├── auth/                 # SLICE 1: IDENTITY
 │   ├── strategies/       # Google JWT Strategy
 │   ├── guards/           # JwtAuthGuard
 │   ├── interfaces/       # IUserRepository
 │   ├── repositories/     # PrismaUserRepository
 │   └── auth.controller.ts# Endpoint: GET /auth/sync (Upsert user)
 │
 ├── google-calendar/      # SLICE 2: EXTERNAL INTEGRATION
 │   ├── interfaces/       # ICalendarProvider
 │   └── services/         # GoogleCalendarService (Adapter to fetch events)
 │
 ├── availability/         # SLICE 3: CORE DOMAIN
 │   ├── domain/           # Rich Domain Models (TimeSlot, DailyAvailability)
 │   └── availability.controller.ts # Endpoint: GET /availability
 │
 └── bookings/             # SLICE 4: COMMANDS & TRANSACTIONS
     ├── interfaces/       # IBookingRepository
     ├── repositories/     # PrismaBookingRepository
     └── bookings.controller.ts # Endpoints: POST /bookings, GET /bookings, DELETE /bookings
```

---

## AI Agent Workflow Check

Before writing code for a new feature, the AI must mentally verify:

  1. Is the DB Postgres via Docker?
  2. Are DTOs validated with class-validator?
  3. Am I injecting an interface (e.g., IUserRepository) instead of Prisma directly?
  4. Are tests written in Jest?
  5. Will this endpoint's return value pass through the Global Interceptor to match the { success, data/error } contract?