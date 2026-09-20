# Shortify - Advanced MERN URL Shortener 

Shortify is a high-performance, full-stack URL shortening service built with the MERN stack (MongoDB, Express, React, Node.js) and Tailwind CSS v4. It goes beyond basic CRUD operations by implementing production-grade architectural patterns including in-memory caching, atomic database operations, hardware-efficient data purging, concurrency, and web scraping.

This document serves as both the project documentation and an in-depth technical guide explaining the "how" and "why" behind the system's architecture.

---

## 💻 Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS v4, Context API (State/Theme), Axios, Lucide React, QRCode.react
*   **Backend:** Node.js, Express, JSON Web Tokens (JWT), Bcrypt.js, Cheerio, Node-Cache, Express-Rate-Limit
*   **Database:** MongoDB, Mongoose ODM

---

## 🏗️ System Architecture & Technical Implementation

This section breaks down the core features of the application, detailing exactly how they were implemented to solve real-world engineering problems. 

### 1. High-Performance Redirection (Caching & Atomic Updates)
*   **The Problem:** Querying the database for every single link click creates a massive bottleneck and high server load. Furthermore, waiting for the database to update the click analytics before redirecting the user causes latency.
*   **The Implementation:**
    *   **In-Memory Cache:** Implemented `node-cache` on the `/:code` redirection route. When a URL is requested, the server checks the RAM first. 
    *   **Cache Miss:** If not in memory, the server queries MongoDB, caches the result (`{ longUrl, hasPassword }`), and redirects.
    *   **Fire-and-Forget Analytics:** Instead of pulling the document, modifying it, and saving it, the server issues a non-blocking, asynchronous `$inc` (increment) command directly to MongoDB (`Url.updateOne`). Because there is no `await` blocking the response, the user is redirected instantly while the database updates the analytics in the background.

### 2. Hardware-Efficient Data Purging (Anonymous Users)
*   **The Problem:** Allowing non-logged-in users to create links fills the database with dead data. Using a Node.js `cron` job to periodically search and delete old links consumes heavy CPU and memory.
*   **The Implementation:**
    *   **MongoDB TTL Indexes:** Configured a Time-To-Live (TTL) index on the Mongoose schema: `UrlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`.
    *   **Logic:** When an anonymous user creates a link, the backend automatically sets the `expiresAt` field to exactly 24 hours in the future. MongoDB's internal background thread automatically monitors this index and drops the document the exact second it expires, completely offloading the cleanup task from the Node.js server.

### 3. Concurrency & Client-Side Offloading (Bulk Shortening)
*   **The Problem:** Uploading a CSV of URLs and processing them sequentially blocks the Node event loop and results in slow API responses.
*   **The Implementation:**
    *   **Client-Side CSV Parsing:** To save server bandwidth, the frontend utilizes the browser's native `FileReader` API to parse the uploaded `.csv` file. It extracts the URLs, filters invalid inputs, and sends a clean JSON array to the backend.
    *   **Parallel Processing:** The backend maps over the array of URLs and processes them concurrently using `Promise.all()`. This allows the server to run the metadata scraping and ID generation for all links simultaneously rather than one by one.
    *   **Batch Database Writes:** Instead of hitting the database 10 separate times, the server uses Mongoose's `Url.insertMany()` to write the entire array to the database in a single, highly optimized network request.

### 4. Automated Categorization (Web Scraping)
*   **The Problem:** We wanted to categorize links (Technology, Entertainment, News) without forcing the user to manually select a category or paying for an AI API.
*   **The Implementation:**
    *   **Axios & Cheerio:** During URL creation, the backend makes a lightweight, timeout-restricted `axios` GET request to the target URL. 
    *   **Parsing:** `cheerio` is used to parse the returned HTML, specifically extracting the `<title>` and `<meta name="description">` tags.
    *   **Regex Matching:** A RegEx engine scans the extracted text against keyword dictionaries to accurately assign a category tag before saving the link to the database.

### 5. Advanced Analytics (Referrer & Device Tracking)
*   **The Problem:** Standard click counters do not provide actionable data about traffic sources.
*   **The Implementation:**
    *   **Device Detection:** The backend parses the `req.headers['user-agent']` using Regex to identify if the request is originating from a mobile or desktop device.
    *   **Referrer Extraction:** The server reads `req.headers.referer`. To prevent analytics fragmentation (e.g., separating `https://twitter.com/post/1` and `https://twitter.com/post/2`), it passes the string through Node's native `URL` constructor to extract strictly the root `hostname` (e.g., `twitter.com`).
    *   **Mongoose Maps:** This data is stored in a `Map` data structure in MongoDB, allowing for dynamic key-value pairs representing traffic sources.

### 6. Security (Rate Limiting & Cryptography)
*   **The Problem:** Public APIs are vulnerable to brute-force auth attacks and automated spam. Password-protected links must not store plain text.
*   **The Implementation:**
    *   **Rate Limiting:** `express-rate-limit` is deployed selectively. A strict 10-request/hour limit is applied to `/login` and `/register` to stop brute-forcing. A 20-request/15-minute limit is applied to the URL creation endpoints to stop spam.
    *   **Bcrypt Hashing:** Link passwords and user account passwords are mathematically hashed using `bcryptjs` with a salt factor of 10. 
    *   **Lock Screen Intercept:** If a cached link is flagged with `hasPassword: true`, the backend intercepts the redirection and sends the user to a React `/unlock/:code` route. The frontend then verifies the user's PIN via a secure backend comparison before revealing the destination.

---

## 🚀 Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone [https://github.com/yourusername/shortify.git](https://github.com/yourusername/shortify.git)
cd shortify

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```


### 2. Environment Configuration
Create a .env file in the server directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://your_username:your_password@cluster0.mongodb.net/shortify
JWT_SECRET=your_super_secret_jwt_key
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```


### 3. Run the Application
You will need two terminal windows to run both servers simultaneously.

#### Terminal 1 (Backend):

```Bash
cd server
npm start
Terminal 2 (Frontend):

cd client
npm run dev
```

---

# 📡 API Endpoints Overview
## Authentication (/api/auth)
- POST /register - Creates a new user (admin or standard). Protect via rate-limit.

- POST /login - Verifies credentials, issues JWT token.

## URL Management (/api/url)
- POST /shorten - Shortens a single URL (Auth optional). Accepts custom alias, length, expiry, and password.

- POST /shorten-bulk - Shortens up to 10 URLs in parallel.

- POST /unlock/:code - Verifies a password for a protected link and returns the original URL.

- GET /my-urls - Retrieves all URLs created by the authenticated user.

- GET /all-urls - Admin-only route to view the entire database.

- DELETE /:id - Deletes a URL (Must be owner or Admin).

## Redirection (/)
- GET /:code - The core redirect endpoint. Hits the cache, updates analytics, and redirects the client.

---

# System Architecture

```mermaid
flowchart TB

    %% =========================
    %% CLIENT LAYER
    %% =========================
    subgraph Client["Client Layer (Frontend)"]
        User["👤 User"]
        Browser["🌐 Web Browser (React + Vite)"]
        FileReader["📂 FileReader API (CSV Parsing)"]
        Context["⚛️ Context API (Auth/Theme)"]
        Axios["📡 Axios"]
    end

    %% =========================
    %% BACKEND LAYER
    %% =========================
    subgraph Backend["Backend Layer (Node.js/Express)"]
        API["🚂 Express API Router"]
        RateLimiter["🛡️ Rate Limiter"]
        AuthMiddleware["🔐 JWT Middleware"]
        URLService["🔗 URL Generator (shortid/crypto)"]
        Scraper["🕷️ Cheerio (Meta Scraper)"]
        Bcrypt["🔑 Bcrypt (Password Hashing)"]
        Cache["⚡ Node-Cache (In-Memory)"]
    end

    %% =========================
    %% DATABASE LAYER
    %% =========================
    subgraph Database["Database Layer (MongoDB)"]
        MongoDB[("🍃 MongoDB Atlas")]
        UsersCollection["Users Collection"]
        URLsCollection["URLs Collection"]
        TTLIndex["⏱️ TTL Index (Guest Auto-Purge)"]
    end

    %% =========================
    %% REQUEST FLOW
    %% =========================
    User --> Browser
    Browser <--> FileReader
    Browser <--> Context
    Context --> Axios
    Axios --> RateLimiter

    RateLimiter --> API
    API --> AuthMiddleware

    %% =========================
    %% SERVICES
    %% =========================
    API <--> Cache
    API --> URLService
    API --> Scraper
    API --> Bcrypt

    %% =========================
    %% DATABASE CONNECTIONS
    %% =========================
    AuthMiddleware --> UsersCollection
    Bcrypt --> URLsCollection
    URLService --> URLsCollection
    URLsCollection --- TTLIndex
    URLsCollection <--> MongoDB
    UsersCollection <--> MongoDB
```

---
# URL Shortening Flow

```mermaid
sequenceDiagram
    participant U as User
    participant R as React Frontend
    participant A as Express API
    participant C as Cheerio Scraper
    participant DB as MongoDB

    U->>R: Submits URL(s) + Password + Expiry
    Note over R: Client parses CSV if Bulk Upload
    R->>A: POST /api/url/shorten (or shorten-bulk)
    A->>A: Apply Rate Limiter (20 req/15min)
    A->>A: Check JWT (Assign Guest or User ID)
    
    par Metadata Scraping
        A->>C: Fetch Target URL
        C-->>A: Return Title/Meta Tags
        A->>A: Regex match to assign Category
    end
    
    A->>A: Generate custom or random code
    
    alt Password Provided
        A->>A: Bcrypt hash password
    end

    A->>DB: Insert Document (or insertMany)
    Note over DB: Sets expiresAt field for TTL Index
    DB-->>A: Confirmation
    A-->>R: JSON URL Data
    R-->>U: Display Short URL & QR Code
```

---
# High-Performance URL Redirect Flow
```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant A as Express API
    participant NC as Node-Cache
    participant DB as MongoDB

    U->>B: Click short URL
    B->>A: GET /:code
    A->>A: Extract User-Agent & Referrer
    
    A->>NC: Check Memory Cache
    
    alt Cache Miss
        NC-->>A: null
        A->>DB: FindOne({ urlCode })
        DB-->>A: Return URL Document
        A->>NC: Set Cache { longUrl, hasPassword }
    else Cache Hit
        NC-->>A: Return { longUrl, hasPassword }
    end

    par Async Fire & Forget Analytics
        A-)DB: Atomic $inc update (clicks, device, referrer)
    end

    alt hasPassword == true
        A-->>B: HTTP Redirect to React /unlock/:code
        B->>U: Display Password Lock Screen
    else No Password
        A-->>B: HTTP Redirect to longUrl
        B->>U: Load original website
    end
```


---
# Authentication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant R as React Frontend
    participant A as Express API (Auth)
    participant BC as Bcrypt
    participant DB as MongoDB

    U->>R: Enter Email & Password
    R->>A: POST /api/auth/login
    A->>A: Apply Strict Rate Limiter (10 req/hr)
    A->>DB: Find user by email
    
    alt User not found
        DB-->>A: null
        A-->>R: 400 Invalid Credentials
    else User found
        DB-->>A: User Document
        A->>BC: compare(raw password, hashed password)
        
        alt Passwords match
            BC-->>A: true
            A->>A: Generate JWT Payload
            A-->>R: 200 OK + JWT Token + User Data
            R->>R: Update AuthContext & LocalStorage
            R-->>U: Redirect to Dashboard
        else Passwords do not match
            BC-->>A: false
            A-->>R: 400 Invalid Credentials
        end
    end
```

--- 
# High-Level Request Flow
```mermaid
flowchart TD
    %% 1. Client Request
    Client["👤 Client (React App / Web Browser)"] -->|Initiates HTTP/HTTPS Request| Server["🚂 Express.js Server"]

    %% 2. Security & Parsing
    subgraph Step2 ["2. Security & Parsing (Middleware Layer)"]
        direction TB
        RL["🛡️ Rate Limiter (express-rate-limit)"]
        BP["📦 Body Parser & CORS"]
        Auth["🔐 JWT Authentication (req.user)"]
        
        RL -->|Under Quota| BP
        BP --> Auth
    end

    Server --> Step2

    %% 3. Cache Evaluation (Redirects Only)
    subgraph Step3 ["3. Cache Evaluation (Redirection)"]
        direction TB
        CacheCheck{"⚡ Node-Cache (RAM)"}
    end

    Auth -->|GET /:code| CacheCheck
    Auth -->|POST /api/*| Step4

    %% 4. Business Logic
    subgraph Step4 ["4. Business Logic & Processing"]
        direction TB
        Scrape["🕷️ Axios + Cheerio (Categorization)"]
        Crypto["🔑 Crypto (Code) + Bcrypt (Password)"]
        Headers["📊 Parse User-Agent & Referer"]
    end

    CacheCheck -->|Cache Miss| Step4
    Scrape --> Crypto

    %% 5. Database Operations
    subgraph Step5 ["5. Database Operations (MongoDB)"]
        direction TB
        Mongo[("🍃 MongoDB (Mongoose ODM)")]
        Atomic["⚡ Non-Blocking Atomic Update ($inc)"]
        TTL["🗑️ TTL Index (Auto-Purge Guests)"]
    end

    Crypto --> Mongo
    Step4 --> Atomic
    Atomic -.->|Background Write| Mongo
    TTL -.->|Drops Expired Docs| Mongo
    CacheCheck -.->|Fire & Forget Analytics| Atomic

    %% 6. Client Response
    subgraph Step6 ["6. Client Response"]
        direction TB
        Res["📤 JSON Payload OR 302/Unlock Redirect"]
    end

    CacheCheck -->|Cache Hit| Res
    Mongo --> Res
    Res --> Client
```
