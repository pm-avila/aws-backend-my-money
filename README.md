# aws-backend-my-money
Simplify personal financial control through a complete web solution, enabling organized and visual tracking of income, expenses, and current account balances.

## 📋 Step-by-Step Guide - Running the My Money Backend Application

### 🔧 Prerequisites
- Node.js (version 18 or higher)
- Docker and Docker Compose
- Git

### 📂 1. Navigate to the application directory
```bash
cd aws-backend-my-money
```

### 📦 2. Install dependencies
```bash
npm install
```

### 🗄️ 3. Configure PostgreSQL database

#### 3.1. Start PostgreSQL container
```bash
# Navigate to the root directory (where docker-compose.yml is located)
cd ..
docker-compose up -d
```

#### 3.2. Verify database is running
```bash
docker-compose logs postgres
```

### ⚙️ 4. Configure environment variables
Create a `.env` file in the `prisma/` directory with:
```
DATABASE_URL="postgresql://myapp_user:myapp_password@localhost:5432/myapp_db"
JWT_SECRET="your_jwt_secret_here"
PORT=3000
```

### 🔧 5. Configure Prisma

#### 5.1. Generate Prisma Client
```bash
# Return to application directory
cd aws-backend-my-money
npx prisma generate
```

#### 5.2. Run database migrations
```bash
npx prisma migrate deploy
```

### 🚀 6. Run the application

#### For development (with hot reload):
```bash
npm run dev
```

#### For production:
```bash
npm start
```

### ✅ 7. Verify it's working
The application will be running at: `http://localhost:3000`

You can test by making a GET request to:
```bash
curl http://localhost:3000
```
Should return: `My Money Backend API`

### 🔍 8. Available endpoints
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/account` - List accounts
- `POST /api/account` - Create account
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction

#### Example: Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "password": "123456789",
    "name": "João Silva"
  }'
```

**Required fields:**
- `email` (required)
- `password` (required)
- `name` (optional)

**Expected success response:**
```json
{
  "id": 1,
  "email": "joao@email.com",
  "name": "João Silva",
  "createdAt": "2023-08-30T21:00:00.000Z",
  "updatedAt": "2023-08-30T21:00:00.000Z"
}
```

**Note:** The endpoint automatically creates default categories for the new user (Salary, Food, Transport, Shopping, Bills, Entertainment, Health).

### 🛑 9. Stop the application
- **Backend**: `Ctrl + C` in terminal
- **Database**: `docker-compose down`

### 🔧 Useful development commands
```bash
# View database logs
docker-compose logs postgres

# Reset database (warning - deletes all data!)
npx prisma migrate reset

# View data in Prisma Studio
npx prisma studio
```

## Architecture
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt password hashing
- **Containerization**: Docker with docker-compose
