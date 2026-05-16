---

# **VietFlood Flood Reporting, Relief Coordination & Real-Time Tracking Platform**

## **Objective**

**Develop a comprehensive multi-platform flood reporting and relief coordination system for Vietnam. The VietFlood project combines a NestJS backend, a shared TypeScript common library, a React Native mobile application, and a Next.js web frontend to help citizens report flood incidents and help relief teams monitor, verify, and respond to field reports. The system integrates the following key modules:**

### **VietFlood Backend Service**

* **Provides the API gateway, authentication service, reports service, and real-time tracking gateway using NestJS microservices.**
* **Uses RabbitMQ for service-to-service messaging between the API gateway, auth service, and reports service.**
* **Stores users, refresh tokens, and flood reports in PostgreSQL through TypeORM.**
* **Uses JWT and refresh tokens for authenticated citizen, relief, and admin workflows.**
* **Uploads report evidence files to Cloudinary and stores structured evidence metadata with each report.**
* **Broadcasts live user location updates through Socket.IO for real-time relief tracking.**

### **vietflood_common Shared Library**

* **Provides reusable infrastructure modules shared by the backend services.**
* **Exports structured logging, Redis integration, and Cloudinary upload helpers.**
* **Keeps cross-service utilities centralized so the API gateway, auth service, and reports service use consistent behavior.**

### **VietFlood Mobile Application**

* **Provides the citizen and relief worker mobile experience using Expo, React Native, and TypeScript.**
* **Supports authentication, profile management, report creation, relief report review, maps, user overview screens, and role-based navigation.**
* **Uses device location, image picking, secure token storage, Redux state management, and localized UI strings.**
* **Supports development test accounts and a mock-auth switch for local testing.**

### **Vietflood Web Frontend**

* **Provides an admin-focused web dashboard using Next.js, React, TypeScript, and TailwindCSS.**
* **Supports admin login, protected token storage, automatic token refresh, report overview, status filtering, status updates, and flood insight pages.**
* **Connects to the same backend API gateway used by the mobile application.**

---

## **Technologies Used & Pricing**

### **Back-end**

* **NestJS: Free, open-source TypeScript framework for modular APIs and microservices.**
* **RabbitMQ: Free if self-hosted through Docker; managed RabbitMQ services have additional costs.**
* **Socket.IO: Free, open-source real-time communication library for live tracking.**
* **TypeORM: Free, open-source ORM used with PostgreSQL.**
* **Passport/JWT: Free, open-source authentication tooling for access and refresh token flows.**

#### **Backend Applications:**

* **`api-gateway`: Public HTTP and WebSocket entry point for auth, reports, and tracking.**
* **`auth-service`: RabbitMQ microservice for users, login, registration, refresh tokens, logout, and profile updates.**
* **`reports-service`: RabbitMQ microservice for flood report creation, update, deletion, status management, and tracking queries.**

### **Shared Common Library**

* **TypeScript: Free, open-source language used across the backend and shared package.**
* **tsup: Free, open-source bundler used to publish `vietflood-common`.**
* **ioredis: Free, open-source Redis client used by the shared Redis module.**
* **Cloudinary SDK: Free tier available; pricing depends on storage, transformations, and bandwidth after the free allowance.**

### **Database**

* **PostgreSQL: Free when self-hosted locally; managed services such as Azure Database for PostgreSQL, AWS RDS, or Supabase may charge based on compute and storage.**
* **Redis: Free when self-hosted through Docker; managed Redis services have additional costs.**

### **Infrastructure**

* **Docker and Docker Compose: Free, open-source tooling for local and production container orchestration.**
* **Azure App Service: Used by the current deployment target; pricing depends on the selected App Service plan.**
* **Docker Hub: Free tier available for public images; paid plans may apply for private repositories or higher usage.**

### **Front-end (Mobile)**

* **Expo: Free tier available for local development; EAS Build may require paid usage depending on build volume and plan.**
* **React Native: Free, open-source framework for iOS, Android, and web builds.**
* **NativeWind and TailwindCSS: Free, open-source styling utilities for React Native UI.**
* **React Navigation: Free, open-source navigation library.**
* **Redux Toolkit: Free, open-source state management library.**

### **Front-end (Web)**

* **Next.js: Free, open-source React framework.**
* **React: Free, open-source UI library.**
* **TailwindCSS: Free, open-source utility-first CSS framework.**
* **Vercel or Azure Static/Web Hosting: Deployment cost depends on the selected hosting provider and plan.**

### **External APIs and Media**

* **Vietnam Provinces Open API: Used by the mobile app for Vietnam administrative division data.**
* **Cloudinary: Used for report evidence uploads and optimized media delivery.**

### **CI/CD**

* **GitHub Actions: Free tier available; paid usage depends on repository type and minutes consumed.**
* **Docker Buildx: Free, open-source Docker image build tooling.**
* **Azure CLI: Used in the deployment workflow to configure and restart the Azure App Service.**

---

## **Implementation Methodology**

### **1. Monorepo Project Layout**

**The VietFlood workspace is organized as a monorepo with four main modules:**

* **`VietFlood`: Backend service containing the NestJS API gateway and RabbitMQ microservices.**
* **`vietflood_common`: Shared common library published as `vietflood-common` and consumed by the backend.**
* **`VietFlood_mobile`: Expo React Native mobile application for citizens and relief workers.**
* **`Vietflood_web`: Next.js web dashboard for administrative and relief monitoring workflows.**

### **2. Backend Service with NestJS & Microservices**

#### **a. API Gateway**

* **Reads `API_GATEWAY_PORT` from the backend environment.**
* **Exposes REST endpoints under `/auth` and `/reports`.**
* **Accepts report evidence uploads through multipart file fields named `files`.**
* **Broadcasts real-time location updates through Socket.IO events.**

#### **b. Auth Service**

* **Consumes RabbitMQ messages from `auth_queue`.**
* **Handles registration, login, user profile, user management, token refresh, and logout.**
* **Seeds an admin account using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.**

#### **c. Reports Service**

* **Consumes RabbitMQ messages from `reports_queue`.**
* **Stores report category, description, address, coordinates, urgency, severity, status, evidence metadata, and owner user ID.**
* **Supports status values such as pending, verified, resolved, and rejected.**


#### **d. Docker Deployment**

* **Local Docker Compose builds the API gateway, auth service, reports service, Redis, and RabbitMQ.**
* **Production Docker Compose uses Docker Hub images for `vietflood-api-gateway`, `vietflood-auth-service`, and `vietflood-reports-service`.**
* **The GitHub Actions deployment workflow builds service images and deploys the multi-container stack to Azure App Service.**

### **3. Shared Common Library**

#### **a. Library Responsibilities**

* **`LoggerService`: Emits structured JSON logs with timestamp, level, service name, trace context, user ID, role, request path, and method.**
* **`RedisModule` and `RedisService`: Provide a shared Redis client using environment-based Redis configuration.**
* **`CloudinaryModule` and `CloudinaryService`: Provide upload, delete, rename, optimized URL, raw URL, buffer upload, file path upload, and base64 upload helpers.**

#### **b. Usage Example**

**Backend modules import shared infrastructure from the common package:**

```typescript
import { CloudinaryModule, LoggerService, RedisModule } from "vietflood-common";
```

**The reports service uses the Cloudinary helper to upload report evidence, while the auth and reports services use Redis and structured logging through the same shared package.**

### **4. Mobile Application with Expo React Native**

#### **a. Mobile Features**

* **Login, registration, profile screens, and token-based authentication.**
* **Citizen report creation and report management.**
* **Relief report list, relief report detail, relief map, and status-oriented workflows.**
* **Device location support for location-aware reports and relief coordination.**
* **Vietnamese and English localization files, with the app structure ready for additional languages.**
* **Role-based navigation and feature rollout boundaries for citizen, relief, and admin-style experiences.**

#### **b. Mobile Configuration**

**The mobile app uses environment and TypeScript config values for API behavior:**

```bash
EXPO_PUBLIC_USE_MOCK_AUTH=
EXPO_PUBLIC_AUTH_API_BASE_URL=
```

**Development and production config currently point to the deployed API gateway by default:**

```bash
https://vietflood-app.azurewebsites.net
```

**The mobile app also uses the Vietnam divisions API for province and ward data:**

```bash
https://provinces.open-api.vn/api/v1
```

#### **c. Mobile Test Accounts**

**For local development, the mobile README documents development-only test accounts. These accounts require the backend database to be seeded before login works.**

* **Relief Coordinator Account: `test-relief@vietflood.local` / `Test123!@#`.**
* **Standard User Account: `test-user@vietflood.local` / `Test123!@#`.**

### **5. Web Frontend with Next.js**

#### **a. Web Features**

* **Admin login page connected to the backend `/auth/sign_in` endpoint.**
* **Admin-only profile validation through `/auth/profile`.**
* **Access token and refresh token storage in browser local storage.**
* **Automatic token refresh through `/auth/refresh_token`.**
* **Report dashboard with search, status filters, report evidence previews, reporter details, and status update controls.**
* **Overview and home pages for flood insight presentation.**

#### **b. Web Environment Variables**

**The web frontend reads the backend API base URL from:**

```bash
NEXT_PUBLIC_AUTH_API_BASE_URL=
```

**If the variable is not provided, the web frontend falls back to:**

```bash
https://vietflood-app.azurewebsites.net
```

### **6. Core Usage Examples**

#### **a. Sign In**

**Clients authenticate through the API gateway:**

```http
POST /auth/sign_in
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### **b. Create a Flood Report**

**Authenticated mobile users create flood reports through the reports API. Evidence files are uploaded with the `files` multipart field.**

```http
POST /reports/create
Authorization: Bearer <access-token>
Content-Type: multipart/form-data
```

#### **c. Load Reports for Relief or Admin Users**

```http
GET /reports
Authorization: Bearer <access-token>
```

#### **d. Update Report Status**

```http
PUT /reports/update/:reportId/admin/:userId
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "status": "verified"
}
```

#### **e. Send Real-Time Location**

**Socket.IO clients emit `send-location` to the API gateway. The gateway validates coordinates and broadcasts `receive-location` to connected clients.**

```json
{
  "latitude": 10.7769,
  "longitude": 106.7009,
  "accuracy": 12,
  "timestamp": 1710000000000
}
```

### **7. CI/CD and Deployment**

* **GitHub Actions builds Docker images for the API gateway, auth service, and reports service.**
* **Docker images are pushed to Docker Hub with both commit SHA and `latest` tags.**
* **Azure App Service is configured with `docker-compose.prod.yml` for multi-container deployment.**
* **Production secrets and environment variables are managed in Azure App Service settings, not committed to source control.**

---

## **Summary**

* **VietFlood delivers an end-to-end flood reporting and relief coordination system across backend, shared library, mobile app, and web dashboard.**
* **The backend uses NestJS, RabbitMQ, PostgreSQL, Redis, JWT, Cloudinary, and Socket.IO to support secure reporting and real-time tracking.**
* **`vietflood_common` centralizes shared logging, Redis, and Cloudinary infrastructure for backend services.**
* **The mobile app uses Expo React Native for citizen and relief workflows, including reports, profiles, maps, and localized UI.**
* **The web frontend uses Next.js for admin login, report monitoring, status management, and flood insight views.**
* **Docker Compose supports local and production service orchestration.**
* **GitHub Actions and Azure App Service automate backend container deployment.**

### **Pricing Overview**

* **NestJS, React Native, Next.js, TypeScript, TailwindCSS, RabbitMQ, Redis, TypeORM, and Docker are free/open-source when self-hosted.**
* **PostgreSQL is free locally; managed database pricing depends on provider, compute, and storage.**
* **Cloudinary offers a free tier; costs increase with storage, transformations, and bandwidth.**
* **Expo local development is free; EAS Build pricing depends on build usage and plan.**
* **Azure App Service pricing depends on the selected App Service plan.**
* **GitHub Actions includes free minutes depending on repository type and account plan.**
