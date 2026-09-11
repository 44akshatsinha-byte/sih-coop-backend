# SIH Cooperative Backend — Cooperative Gig Services Platform

Backend API for a **Cooperative Gig Services Platform** built for Smart India Hackathon (SIH). Workers earn **85%** of gig payments while **15%** goes to a shared **cooperative pool** for community benefit.

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express.js | 5.2.1 |
| Database | MongoDB + Mongoose ODM | 9.9.3 |
| Auth | JWT + bcryptjs | 9.0.3 / 3.0.3 |
| Payments | Razorpay | 2.9.8 |
| Config | dotenv | 17.4.2 |
| CORS | cors | 2.8.6 |
| Dev Tools | Nodemon, Jest, ESLint | - |

---

## Project Structure

```
sih-coop-backend/
├── server.js                 # Main entry point (consolidated)
├── package.json              # Dependencies & scripts
├── .env.example              # Environment template
├── .gitignore
├── README.md
├── TECHNICAL_REPORT.md       # Detailed technical documentation
├── config/
│   └── db.js                 # MongoDB connection with pooling
├── middleware/
│   └── authMiddleware.js     # JWT auth + role-based access
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

## Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas account (or local MongoDB)
- Razorpay test account (for payments)

### Steps

```bash
# 1. Clone & install
git clone https://github.com/44akshatsinha-byte/sih-coop-backend.git
cd sih-coop-backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start server
npm run dev      # Development with nodemon
npm start        # Production
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | **Yes** | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | JWT signing secret (32+ chars for production) |
| `JWT_EXPIRY` | No | Token expiry (default: `1h`) |
| `RAZORPAY_KEY_ID` | Yes | Razorpay API key |
| `RAZORPAY_SECRET` | Yes | Razorpay API secret |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` / `production` |
| `CORS_ORIGIN` | No | Frontend URL for CORS |

---

## API Endpoints

**Base URL:** `http://localhost:3000/api`

### Health
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Server health check |

### Auth (`/api/auth`)
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/register` | Public | Register user |
| `POST` | `/login` | Public | Login, returns JWT |
| `GET` | `/me` | Private | Get current user |

**Register:**
```json
{
  "name": "John",
  "email": "john@example.com",
  "password": "pass123",
  "role": "customer",
  "phone": "+919876543210",
  "skills": ["plumbing", "electrical"]
}
```

**Login:**
```json
{ "email": "john@example.com", "password": "pass123" }
```

### Gigs (`/api/gigs`)
| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/` | Customer/Admin | Create gig |
| `GET` | `/` | Public | List gigs (filter, search, paginate) |
| `GET` | `/my-gigs` | Private | Current user's gigs |
| `GET` | `/:id` | Public | Get single gig |
| `PUT` | `/:id` | Owner/Admin | Update gig |
| `PUT` | `/:id/accept` | Worker/Admin | Accept gig |
| `PUT` | `/:id/complete` | Customer/Worker/Admin | Complete + payout |
| `PUT` | `/:id/cancel` | Owner/Admin | Cancel gig |
| `DELETE` | `/:id` | Admin | Delete gig |

**Create Gig:**
```json
{
  "title": "Fix Leaking Sink",
  "description": "Kitchen pipe leaking",
  "amount": 500,
  "category": "plumbing",
  "location": "Bangalore",
  "estimatedDuration": "2 hours"
}
```

**Query Params (GET /):**
- `status` - pending, accepted, in-progress, completed, cancelled
- `category` - filter by category
- `page` - page number (default: 1)
- `limit` - per page (max 100, default: 20)
- `sortBy` - field to sort (default: createdAt)
- `sortOrder` - asc/desc (default: desc)
- `minAmount`, `maxAmount` - price range
- `search` - text search title/description

### Payments (`/api/payments`)
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/create-order` | Create Razorpay order |
| `POST` | `/verify` | Verify payment signature |
| `GET` | `/order/:orderId` | Fetch order details |
| `GET` | `/payment/:paymentId` | Fetch payment details |

**Create Order:**
```json
{ "amount": 500, "currency": "INR" }
```

**Verify Payment:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

---

## Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed, select: false),
  role: "customer" | "worker" | "admin",
  balance: Number (default: 0),
  phone: String,
  skills: [String],
  isVerified: Boolean,
  avatar: String
}
```

### Gig
```javascript
{
  title: String,
  description: String,
  amount: Number,
  status: "pending" | "accepted" | "in-progress" | "completed" | "cancelled",
  paymentStatus: "pending" | "paid" | "refunded" | "failed",
  customer: ObjectId → User,
  worker: ObjectId → User (nullable),
  category: String,
  location: String,
  images: [String],
  completedAt: Date,
  cancelledAt: Date
}
```

### CooperativePool
```javascript
{
  totalBalance: Number,
  transactions: [{ gigId, amount, type, description }],
  distributionHistory: [{ amount, distributedTo, description }]
}
```

---

## Authentication

- **Password:** bcrypt 12 rounds
- **Token:** JWT, 1-hour expiry, payload `{ id, role }`
- **Header:** `Authorization: Bearer <token>`
- **Roles:** `customer`, `worker`, `admin`

**Protected routes use:** `authMiddleware` + `requireRole(...)`

---

## Cooperative Pool Mechanics

- **Split:** 85% worker / 15% pool (constants in `routes/gigs.js`)
- **On completion:** Atomic MongoDB transaction
  - Worker balance += 85%
  - Pool balance += 15%
  - Transaction recorded in pool history
- **Query:** `GET /api/gigs/:id/complete` returns breakdown

---

## Key Features

- ✅ Single consolidated MongoDB-backed server
- ✅ Full authentication with JWT + role-based access
- ✅ Complete gig lifecycle (create → accept → complete/cancel)
- ✅ Atomic 85/15 payment splits with MongoDB transactions
- ✅ Razorpay integration (create order + verify)
- ✅ Pagination, filtering, search on gigs
- ✅ Database indexes & connection pooling
- ✅ Graceful shutdown & health checks
- ✅ Consistent error responses
- ✅ Environment-based configuration

---

## Scripts

```bash
npm start       # Production
npm run dev     # Development (nodemon)
npm test        # Run tests (Jest)
npm run lint    # ESLint check
npm run lint:fix # Auto-fix lint issues
```

---

## Deployment

### Render / Railway / Heroku
- Build: `npm install`
- Start: `npm start`
- Add all env vars in dashboard

### Docker (optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## License

ISC