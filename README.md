/portfolio-manager/
├── .gitignore
├── README.md
│
├── client/                     <-- 1. Your React Frontend App
│   ├── package.json
│   ├── node_modules/           (ignored)
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       │
│       ├── api/
│       │   └── apiClient.js      (Axios instance for your API)
│       │
│       ├── assets/
│       │   └── logo.png
│       │
│       ├── components/
│       │   ├── common/           (Reusable buttons, modals, etc.)
│       │   │   ├── LoadingSpinner.jsx
│       │   │   └── PrivateRoute.jsx
│       │   ├── charts/           (Your Recharts components)
│       │   │   ├── AllocationPieChart.jsx
│       │   │   └── PerformanceLineChart.jsx
│       │   └── layout/
│       │       ├── Navbar.jsx
│       │       └── Sidebar.jsx
│       │
│       ├── hooks/                (Custom React hooks)
│       │   ├── useAuth.js
│       │   └── usePortfolioData.js (Handles TanStack Query)
│       │
│       ├── pages/                (Your main app views/routes)
│       │   ├── ClientDashboard.jsx
│       │   ├── ClientTransactions.jsx
│       │   ├── AdminDashboard.jsx  (For your friend)
│       │   ├── AdminManageTrades.jsx
│       │   └── Login.jsx
│       │
│       └── store/                (Your Zustand state)
│           ├── authStore.js
│           └── portfolioStore.js
│
├── server/                     <-- 2. Your Node.js/Express Backend API
│   ├── package.json
│   ├── node_modules/           (ignored)
│   ├── .env                    (DB password, JWT secret, API keys)
│   ├── index.js                (Main server entry point)
│   │
│   ├── config/
│   │   ├── db.js               (PostgreSQL connection pool)
│   │   └── passport.js         (JWT authentication strategy)
│   │
│   ├── controllers/            (Handles the request logic)
│   │   ├── authController.js
│   │   ├── portfolioController.js
│   │   └── adminController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js   (Checks for valid JWT)
│   │   └── errorMiddleware.js
│   │
│   ├── models/                 (Handles database queries)
│   │   ├── userModel.js
│   │   ├── portfolioModel.js
│   │   └── transactionModel.js
│   │
│   └── routes/                 (Defines all your API endpoints)
│       ├── authRoutes.js       (e.g., /api/auth/login)
│       ├── portfolioRoutes.js  (e.g., /api/portfolio/me)
│       └── adminRoutes.js      (e.g., /api/admin/add-trade)
│
└── functions/                  <-- 3. Your Azure Functions (EOD Script)
    ├── EodNavCalculator/
    │   ├── function.json       (Configures the timer trigger)
    │   ├── index.js            (The Node.js code for the NAV script)
    │   └── package.json        (Dependencies for this script, e.g., 'pg')
    │
    ├── host.json
    └── local.settings.json     (Secrets for local function testing)