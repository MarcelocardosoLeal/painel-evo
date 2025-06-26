# 🎯 PLANNING.md - Painel Evolution

## 📋 Project Overview

**Project Name:** Painel Evolution  
**Type:** Multi-tenant WhatsApp Instance Management Platform  
**Status:** Production Ready (v1.1.0)  
**Primary Language:** JavaScript (Node.js + Vue.js)  
**Architecture:** Full-stack web application with real-time capabilities  

## 🎯 Vision & Goals

### Primary Objective
Create a secure, multi-tenant web platform that allows users to manage their own WhatsApp instances through Evolution API integration, providing complete isolation between different users' data and instances.

### Key Success Metrics
- ✅ 100% functional WhatsApp instance creation
- ✅ Real-time QR code generation and display
- ✅ Multi-tenant data isolation
- ✅ Secure JWT authentication
- ✅ Admin panel for user management

## 🏗️ Architecture & Tech Stack

### Backend Stack
- **Runtime:** Node.js
- **Framework:** Express.js 4.17.1
- **Database ORM:** Prisma 6.9.0
- **Database:** PostgreSQL
- **Authentication:** JWT (jsonwebtoken 9.0.0)
- **Real-time:** Socket.IO 4.8.1
- **HTTP Client:** Axios 1.9.0
- **Security:** bcryptjs 2.4.3, CORS 2.8.5

### Frontend Stack
- **Framework:** Vue.js 3.2.13 (Composition API)
- **Build Tool:** Vite 7.0.0
- **Routing:** Vue Router 4.5.1
- **Styling:** Tailwind CSS 3.4.17
- **HTTP Client:** Axios 1.9.0
- **Real-time:** Socket.IO Client 4.8.1

### Database Schema
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  isAdmin   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  instances Instance[]
}

model EvolutionSettings {
  id      Int    @id @default(autoincrement())
  baseUrl String
  apiKey  String
}

model Instance {
  id           Int      @id @default(autoincrement())
  name         String
  status       String   @default("disconnected")
  qrCode       String?
  webhookUrl   String?
  userId       Int
  user         User     @relation(fields: [userId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## 🔧 Development Constraints

### Code Organization
- **File Size Limit:** Maximum 500 lines per file
- **Module Structure:** Clear separation by feature/responsibility
- **Import Strategy:** Relative imports within packages
- **Testing:** Pytest unit tests for all new features (when applicable)

### Naming Conventions
- **Files:** camelCase for JS files, PascalCase for Vue components
- **Variables:** camelCase
- **Constants:** UPPER_SNAKE_CASE
- **Database:** snake_case for fields, PascalCase for models

### Security Requirements
- JWT token-based authentication
- Password hashing with bcryptjs
- Multi-tenant data isolation (all queries filtered by userId)
- CORS protection
- Environment variables for sensitive data

## 📁 Project Structure

```
painel-evo/
├── backend/
│   ├── controllers/     # Business logic
│   ├── middlewares/     # Auth, validation, etc.
│   ├── routes/          # API endpoints
│   ├── services/        # External API integration
│   ├── prisma/          # Database connection
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable Vue components
│   │   ├── views/       # Page components
│   │   ├── router/      # Vue Router config
│   │   └── assets/      # Static assets
│   └── public/          # Public files
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
└── docs/                # Documentation files
```

## 🔌 External Integrations

### Evolution API
- **Purpose:** WhatsApp instance management
- **Endpoints Used:**
  - POST `/instance/create` - Create new instance
  - GET `/instance/connect/{instanceName}` - Get QR code
  - POST `/webhook/set/{instanceName}` - Configure webhooks
- **Authentication:** API Key based
- **Data Flow:** Backend ↔ Evolution API ↔ WhatsApp

## 🎨 UI/UX Guidelines

### Design System
- **Framework:** Tailwind CSS utility-first approach
- **Color Scheme:** Modern gradients (blue to purple)
- **Typography:** Clean, readable fonts
- **Responsiveness:** Mobile-first design
- **Components:** Reusable, modular components

### User Experience
- **Authentication Flow:** Simple login/register
- **Dashboard:** Unified interface for all features
- **Real-time Updates:** Socket.IO for live status updates
- **Error Handling:** User-friendly error messages
- **Loading States:** Clear feedback for async operations

## 🚀 Deployment Strategy

### Environment Configuration
- **Development:** Local with hot reload
- **Production:** Docker containerization available
- **Database:** PostgreSQL with Prisma migrations
- **Environment Variables:** Secure configuration management

### Performance Considerations
- **Database:** Indexed queries, efficient relationships
- **Frontend:** Vue 3 Composition API for optimal performance
- **Real-time:** Socket.IO for efficient WebSocket communication
- **Caching:** Browser caching for static assets

## 📊 Monitoring & Maintenance

### Health Checks
- Backend server status endpoint
- Database connection monitoring
- Evolution API integration status
- Real-time connection health

### Logging Strategy
- Console logging for development
- Structured logging for production
- Error tracking and reporting
- Performance monitoring

## 🔄 Development Workflow

### Version Control
- Git with semantic versioning
- Feature branches for new development
- Pull request reviews
- Automated testing (when implemented)

### Documentation Standards
- README.md for project overview
- PLANNING.md for architecture (this file)
- TASK.md for current work tracking
- Inline code comments for complex logic
- API documentation for endpoints

---

**Last Updated:** January 2025  
**Version:** 1.1.0  
**Status:** Production Ready