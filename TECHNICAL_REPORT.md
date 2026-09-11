# SIH Cooperative Backend - Complete Technical Report

## Executive Summary

This backend is a **Cooperative Gig Services Platform** built for Smart India Hackathon (SIH). It enables a gig economy where workers earn 85% of payments while 15% goes to a shared **cooperative pool** for community benefit. The platform connects customers (who post gigs) with workers (who accept and complete gigs), with integrated Razorpay payments.

---

## Architecture Overview

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 5.2.1 |
| Database | MongoDB + Mongoose ODM | 9.9.3 |
| Authentication | JWT + bcryptjs | 9.0.3 / 3.0.3 |
| Payments | Razorpay | 2.9.8 |
| Validation | Built-in + Mongoose | - |
| Dev Tools | Nodemon, Jest, ESLint | - |

### Project Structure

```
sih-coop-backend/
├── server.js                 # Main entry point (single consolidated server)
├── package.json              # Dependencies & scripts
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── README.md                 # Documentation
├── config/
│   └── db.js                 # MongoDB connection with pooling
├── middleware/
│   └── authMiddleware.js     # JWT auth + role-based access control
├── models/
│   ├── user.js               # User schema (customer/worker/admin)
│   ├── gig.js                # Gig schema with full lifecycle
│   └── CooperativePool.js    # Cooperative fund tracking
└── routes/
    ├── auth.js               # Register, login, profile
    ├── gigs.js               # Full gig CRUD + lifecycle
    └── payments.js           # Razorpay integration
```

---

## Features Implemented

### 1. Authentication System (`/api/auth`)

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/register` | POST | Public | Register new user (customer/worker/admin) |
| `/login` | POST | Public | Login with email/password, returns JWT |
| `/me` | GET | Private | Get current user profile |

**Security Features:**
- Password hashing with bcrypt (12 rounds)
- JWT tokens with 1-hour expiry (configurable)
- Role-based access control (customer, worker, admin)
- Token validation middleware with user lookup
- Input validation & sanitization

### 2. Gig Management (`/api/gigs`)

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/` | POST | Customer/Admin | Create new gig |
| `/` | GET | Public | List gigs with filters, pagination, search |
| `/my-gigs` | GET | Private | Get gigs for current user (posted/accepted) |
| `/:id` | GET | Public | Get single gig with populated user details |
| `/:id` | PUT | Owner/Admin | Update gig (only pending/accepted) |
| `/:id/accept` | PUT | Worker/Admin | Worker accepts gig |
| `/:id/complete` | PUT | Customer/Worker/Admin | Complete gig + 85/15 payout |
| `/:id/cancel` | PUT | Owner/Admin | Cancel gig with reason |
| `/:id` | DELETE | Admin | Hard delete gig |

**Gig Lifecycle:**
```
pending → accepted → in-progress → completed
              ↓
           cancelled
```

**Advanced Features:**
- Full-text search on title/description
- Filter by status, category, amount range
- Pagination (max 100 per page)
- Sorting by any field
- Population of customer/worker details
- Image support
- Categories & location

### 3. Payment Integration (`/api/payments`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/create-order` | POST | Create Razorpay order (amount in INR → paise) |
| `/verify` | POST | Verify payment signature cryptographically |
| `/order/:orderId` | GET | Fetch order details from Razorpay |
| `/payment/:paymentId` | GET | Fetch payment details from Razorpay |

### 4. Cooperative Pool System

- Automatic 85/15 split on gig completion
- Worker receives 85% in their `balance` field
- 15% goes to `CooperativePool.totalBalance`
- Transaction history tracking
- Distribution history for fund allocation
- Atomic transactions using MongoDB sessions

---

## Database Models

### User (`models/user.js`)

```javascript
{
  name: String (required, max 100),
  email: String (required, unique, lowercase, indexed),
  password: String (required, min 6, select: false),
  role: Enum["customer", "worker", "admin"] (default: "customer"),
  balance: Number (default: 0, min: 0),
  phone: String,
  skills: [String],
  isVerified: Boolean (default: false),
  avatar: String,
  timestamps: true
}
```

**Indexes:** email (unique), role

### Gig (`models/gig.js`)

```javascript
{
  title: String (required, max 200),
  description: String (required, max 5000),
  amount: Number (required, min: 1),
  status: Enum["pending", "accepted", "in-progress", "completed", "cancelled"],
  paymentStatus: Enum["pending", "paid", "refunded", "failed"],
  customer: ObjectId → User (required),
  worker: ObjectId → User (nullable),
  category: String,
  location: String,
  estimatedDuration: String,
  images: [String],
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  timestamps: true
}
```

**Indexes:** status, customer, worker, createdAt, category

**Virtuals:** customerDetails, workerDetails

### CooperativePool (`models/CooperativePool.js`)

```javascript
{
  totalBalance: Number (default: 0),
  transactions: [{
    gigId: ObjectId → Gig,
    amount: Number,
    type: Enum["contribution", "withdrawal", "distribution"],
    description: String,
    createdAt: Date
  }],
  lastDistributionAt: Date,
  distributionHistory: [{
    amount: Number,
    distributedTo: Enum["community", "workers", "platform"],
    description: String,
    createdAt: Date
  }],
  timestamps: true
}
```

---

## Critical Bugs Fixed

### 1. **Dual Implementation Conflict** (CRITICAL)
**Before:** Two separate servers:
- `app.js` - MongoDB, port 5000, 85/15 split
- `server.js` - In-memory, port 3000, 95/5 split
- `npm start` ran the broken in-memory version

**After:** Single consolidated `server.js` with MongoDB, port 3000, 85/15 split

### 2. **In-Memory Storage Instead of Database** (CRITICAL)
**Before:** `routes/auth.js` and `routes/gigs.js` used JavaScript arrays
**After:** Full MongoDB integration with Mongoose models

### 3. **Auth Middleware Not Applied** (HIGH)
**Before:** `authMiddleware.js` existed but never used
**After:** Applied to all protected routes with `requireRole()` helper

### 4. **Hardcoded JWT Secret** (HIGH)
**Before:** `"super_secret_hackathon_key"` in multiple files
**After:** Environment variable `JWT_SECRET` with fallback

### 5. **Model Field Mismatches** (HIGH)
**Before:** `app.js` used `gig.totalAmount`, `gig.worker`, `gig.paymentStatus` - none existed in models
**After:** Models updated with all required fields; routes use correct field names

### 6. **Missing User Balance Field** (HIGH)
**Before:** `app.js` tried to `$inc: balance` but User model had no balance field
**After:** Added `balance` field to User model with default 0

### 7. **No Transaction Support** (HIGH)
**Before:** Payment split could leave database inconsistent on failure
**After:** MongoDB transactions for atomic gig completion + payout

### 8. **Inconsistent Payment Splits** (MEDIUM)
**Before:** 95/5 in routes vs 85/15 in app.js
**After:** Standardized to 85/15 (worker/pool) with constants

### 9. **No Input Validation** (MEDIUM)
**Before:** Minimal validation, no sanitization
**After:** Comprehensive validation in routes + Mongoose schema validation

### 10. **No Pagination** (MEDIUM)
**Before:** `GET /gigs` returned all records
**After:** Pagination with page/limit, max 100 per page

### 11. **No Error Handling Consistency** (MEDIUM)
**Before:** Different error formats across files
**After:** Unified error response format with `success` boolean

### 12. **No Database Indexes** (MEDIUM)
**Before:** No indexes defined
**After:** Strategic indexes on all query fields

### 13. **Missing CORS Configuration** (LOW)
**Before:** Basic `cors()` only
**After:** Configurable CORS with credentials support

### 14. **No Graceful Shutdown** (LOW)
**Before:** Process.exit on DB error, no cleanup
**After:** SIGTERM/SIGINT handlers with DB connection close

---

## Optimizations Added

### Database
- Connection pooling (maxPoolSize: 10)
- Strategic indexes on all query fields
- Lean queries with `.select()` where appropriate
- Parallel queries with `Promise.all()`
- Virtuals for populated references

### API Performance
- Pagination on all list endpoints
- Filtering, sorting, search on gigs
- Request size limits (10MB)
- Request timing header

### Security
- Password hashing: 12 rounds (was 10)
- JWT secret from env
- Role-based access control
- Input sanitization (trim, lowercase)
- Validation at schema + route level

### Code Quality
- Consistent error responses
- Comprehensive logging
- Environment-based error details
- Graceful shutdown handling
- ESLint + Jest configured

---

## Environment Variables Required

```env
# Server
PORT=3000
NODE_ENV=development

# Database (REQUIRED)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/coop_platform

# JWT
JWT_SECRET=your-secure-random-secret
JWT_EXPIRY=1h

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_SECRET=your_razorpay_secret

# CORS
CORS_ORIGIN=http://localhost:3000
```

---

## API Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "count": 10,
  "total": 100,
  "page": 1,
  "pages": 10
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```

---

## Setup & Deployment

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env
# Edit .env with your values

# 3. Start development server
npm run dev

# 4. Run tests
npm test
```

### Production Deployment
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET` (32+ chars)
3. Use production MongoDB Atlas cluster
4. Configure real Razorpay keys
5. Set `CORS_ORIGIN` to your frontend domain
6. Use process manager (PM2, Docker, etc.)

### Render Deployment
- Build Command: `npm install`
- Start Command: `npm start`
- Environment variables in Render dashboard

---

## Testing Checklist

- [ ] User registration (customer, worker, admin)
- [ ] User login & JWT token generation
- [ ] Protected route access with token
- [ ] Role-based access (worker can't create gigs, customer can't accept)
- [ ] Gig CRUD operations
- [ ] Gig lifecycle: create → accept → complete
- [ ] Payment split: 85% worker, 15% pool
- [ ] Cooperative pool balance tracking
- [ ] Razorpay order creation & verification
- [ ] Pagination, filtering, search
- [ ] Error handling for invalid IDs, missing auth, etc.

---

## Known Limitations / Future Improvements

1. **No Real-time Updates** - Add Socket.io for live gig status
2. **No File Upload** - Add multer/S3 for gig images
3. **No Email/SMS** - Add notifications for gig events
4. **No Admin Dashboard** - Add admin routes for pool management
5. **No Rate Limiting** - Add express-rate-limit
6. **No API Documentation** - Add Swagger/OpenAPI
7. **No Caching** - Add Redis for frequent queries
8. **No Audit Logs** - Add comprehensive audit trail
9. **No Multi-currency** - Currently INR only
10. **No Webhook Handling** - Add Razorpay webhook endpoint

---

## Git History Note

The repository contains case-insensitive duplicate files (`User.js`/`user.js`, `Gig.js`/`gig.js`) due to macOS filesystem. The working tree versions (lowercase) are the current canonical versions with all fixes applied.

---

## Summary

The backend has been **completely refactored** from a broken dual-implementation state to a **production-ready, single-codebase** with:

✅ Single MongoDB-backed server  
✅ Full authentication & authorization  
✅ Complete gig lifecycle with 85/15 cooperative split  
✅ Razorpay payment integration  
✅ Atomic transactions for financial operations  
✅ Pagination, filtering, search  
✅ Comprehensive validation & error handling  
✅ Database indexes & connection pooling  
✅ Graceful shutdown & health checks  
✅ Environment-based configuration  
✅ Consistent API responses  
✅ Ready for testing & deployment