# 💰 My Money Frontend - React + Tailwind CSS 3

Complete guide for building a modern React frontend with dark/light theme support for the My Money personal finance application.

## 🚀 Project Setup

### Prerequisites
- Node.js 18+
- React 18+
- Tailwind CSS 3+
- Axios for API calls
- React Router DOM for navigation
- Context API for state management

### Initial Setup Commands
```bash
# Create React app
npx create-react-app my-money-frontend
cd my-money-frontend

# Install additional dependencies
npm install axios react-router-dom lucide-react recharts date-fns
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Configure Tailwind CSS
```

### Tailwind Configuration (`tailwind.config.js`)
```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          500: '#10b981',
          600: '#059669',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
```

## 🏗️ Project Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Card.jsx
│   │   └── ThemeToggle.jsx
│   ├── layout/               # Layout components
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── Layout.jsx
│   └── features/             # Feature-specific components
│       ├── auth/
│       ├── dashboard/
│       ├── transactions/
│       ├── categories/
│       ├── accounts/
│       └── reports/
├── contexts/                 # React Context providers
│   ├── AuthContext.jsx
│   ├── ThemeContext.jsx
│   └── DataContext.jsx
├── services/                 # API service layer
│   └── api.js
├── utils/                    # Utility functions
│   ├── formatters.js
│   └── validators.js
├── pages/                    # Page components
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Transactions.jsx
│   ├── Categories.jsx
│   ├── Reports.jsx
│   └── Profile.jsx
└── App.jsx
```

## 🔌 API Integration

### API Service Layer (`src/services/api.js`)
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Account endpoints
export const accountAPI = {
  get: () => api.get('/account'),
  create: (accountData) => api.post('/account', accountData),
  update: (accountData) => api.put('/account', accountData),
};

// Category endpoints
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  create: (categoryData) => api.post('/categories', categoryData),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Transaction endpoints
export const transactionAPI = {
  getAll: (page = 1, limit = 10) => api.get(`/transactions?page=${page}&limit=${limit}`),
  create: (transactionData) => api.post('/transactions', transactionData),
  update: (id, transactionData) => api.put(`/transactions/${id}`, transactionData),
  delete: (id) => api.delete(`/transactions/${id}`),
};

export default api;
```

## 📊 Data Models & Endpoints

### Authentication
```javascript
// POST /api/auth/register
const registerData = {
  email: "user@example.com",     // required
  password: "password123",       // required
  name: "User Name"             // optional
};

// POST /api/auth/login
const loginData = {
  email: "user@example.com",     // required
  password: "password123"        // required
};
```

### Account Management
```javascript
// GET /api/account - Get user account
// Response: { id, userId, name, balance, createdAt, updatedAt }

// POST /api/account - Create account
const accountData = {
  name: "My Account",           // required
  balance: 1000.00             // required
};

// PUT /api/account - Update account
const updateAccountData = {
  name: "Updated Account Name"  // required
};
```

### Categories
```javascript
// GET /api/categories - Get all user categories
// Response: Array of { id, userId, name, type, createdAt, updatedAt }

// POST /api/categories - Create category
const categoryData = {
  name: "Groceries",           // required
  type: "expense"              // required: "income" | "expense"
};

// PUT /api/categories/:id - Update category
const updateCategoryData = {
  name: "Food & Dining",       // required
  type: "expense"              // required: "income" | "expense"
};

// DELETE /api/categories/:id - Delete category
```

### Transactions
```javascript
// GET /api/transactions?page=1&limit=10 - Get transactions (paginated)
// Response: { transactions: [], totalPages, currentPage }

// POST /api/transactions - Create transaction
const transactionData = {
  amount: 50.00,               // required (positive number)
  description: "Grocery shopping", // optional
  date: "2023-08-30T00:00:00Z", // required (ISO string)
  categoryId: 5,               // required (existing category ID)
  type: "expense"              // required: "income" | "expense"
};

// PUT /api/transactions/:id - Update transaction
const updateTransactionData = {
  amount: 75.00,               // required
  description: "Updated description", // optional
  date: "2023-08-30T00:00:00Z", // required
  categoryId: 3,               // required
  type: "expense"              // required
};

// DELETE /api/transactions/:id - Delete transaction
```

## 🎨 Theme System

### Theme Context (`src/contexts/ThemeContext.jsx`)
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

### Theme Toggle Component (`src/components/ui/ThemeToggle.jsx`)
```javascript
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-500" />
      ) : (
        <Moon className="w-5 h-5 text-gray-600" />
      )}
    </button>
  );
};
```

## 📱 Core Components

### Dashboard Page (`src/pages/Dashboard.jsx`)
```javascript
import React, { useState, useEffect } from 'react';
import { accountAPI, transactionAPI } from '../services/api';
import { DashboardStats } from '../components/features/dashboard/DashboardStats';
import { RecentTransactions } from '../components/features/dashboard/RecentTransactions';
import { BalanceChart } from '../components/features/dashboard/BalanceChart';

export const Dashboard = () => {
  const [account, setAccount] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [accountRes, transactionsRes] = await Promise.all([
          accountAPI.get(),
          transactionAPI.getAll(1, 5)
        ]);
        
        setAccount(accountRes.data);
        setRecentTransactions(transactionsRes.data.transactions);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Dashboard
      </h1>
      
      <DashboardStats account={account} />
      <BalanceChart />
      <RecentTransactions transactions={recentTransactions} />
    </div>
  );
};
```

### Transaction Form Component
```javascript
import React, { useState, useEffect } from 'react';
import { transactionAPI, categoryAPI } from '../../services/api';

export const TransactionForm = ({ onSuccess, editTransaction = null }) => {
  const [formData, setFormData] = useState({
    amount: editTransaction?.amount || '',
    description: editTransaction?.description || '',
    date: editTransaction?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    categoryId: editTransaction?.categoryId || '',
    type: editTransaction?.type || 'expense'
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await categoryAPI.getAll();
        setCategories(response.data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        categoryId: parseInt(formData.categoryId),
        date: new Date(formData.date).toISOString()
      };

      if (editTransaction) {
        await transactionAPI.update(editTransaction.id, transactionData);
      } else {
        await transactionAPI.create(transactionData);
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Type
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value, categoryId: '' })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          required
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Amount
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          required
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Category
        </label>
        <select
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          required
        >
          <option value="">Select category</option>
          {filteredCategories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description (optional)
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
      >
        {loading ? 'Saving...' : (editTransaction ? 'Update' : 'Create') + ' Transaction'}
      </button>
    </form>
  );
};
```

## 📊 Reports & Analytics

### Report Data Fetching
```javascript
// Custom hook for reports data
export const useReportsData = (dateRange) => {
  const [data, setData] = useState({
    monthlyTrends: [],
    categoryBreakdown: [],
    incomeVsExpense: []
  });

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const transactions = await transactionAPI.getAll(1, 1000);
        const categories = await categoryAPI.getAll();
        
        // Process data for charts
        const processedData = processTransactionsForReports(
          transactions.data.transactions,
          categories.data,
          dateRange
        );
        
        setData(processedData);
      } catch (error) {
        console.error('Failed to fetch reports data:', error);
      }
    };

    fetchReportsData();
  }, [dateRange]);

  return data;
};

// Data processing utility
const processTransactionsForReports = (transactions, categories, dateRange) => {
  // Filter transactions by date range
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
  });

  // Monthly trends
  const monthlyTrends = processMonthlyTrends(filteredTransactions);
  
  // Category breakdown
  const categoryBreakdown = processCategoryBreakdown(filteredTransactions, categories);
  
  // Income vs Expense
  const incomeVsExpense = processIncomeVsExpense(filteredTransactions);

  return { monthlyTrends, categoryBreakdown, incomeVsExpense };
};
```

### Chart Components
```javascript
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const MonthlyTrendsChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
      <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const CategoryBreakdownChart = ({ data }) => {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="amount"
          nameKey="category"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

## 🎯 Key Features Implementation

### 1. Authentication Flow
- Login/Register forms with validation
- JWT token storage and management
- Protected routes with React Router
- Auto-logout on token expiry

### 2. Real-time Balance Updates
- Update account balance when creating/editing/deleting transactions
- Visual feedback for balance changes

### 3. Transaction Management
- CRUD operations with form validation
- Pagination for large transaction lists
- Search and filter functionality
- Bulk operations (optional)

### 4. Category Management
- Default categories created on registration
- Custom category creation with income/expense types
- Category usage tracking

### 5. Reports & Analytics
- Monthly spending trends
- Category-wise breakdown
- Income vs expense comparison
- Date range filtering
- Export functionality (CSV/PDF)

### 6. Responsive Design
- Mobile-first approach
- Tailwind CSS responsive utilities
- Touch-friendly interface
- Progressive Web App features (optional)

### 7. Dark/Light Theme
- System preference detection
- Manual theme toggle
- Persistent theme selection
- Smooth transitions

## 🚀 Deployment

### Environment Variables
```bash
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

### Build Commands
```bash
# Development
npm start

# Production build
npm run build

# Deploy to Netlify/Vercel
npm run build && npx netlify deploy --prod --dir=build
```

## 🔧 Additional Libraries

### Recommended packages for enhanced functionality:
```bash
# Charts and visualizations
npm install recharts

# Date handling
npm install date-fns

# Icons
npm install lucide-react

# Form validation
npm install react-hook-form yup @hookform/resolvers

# Toast notifications
npm install react-hot-toast

# Loading states
npm install react-loading-skeleton

# PDF generation for reports
npm install jspdf html2canvas
```

This frontend will provide a complete, modern interface for the My Money backend API with professional UI/UX, comprehensive reporting, and responsive design with dark/light theme support.