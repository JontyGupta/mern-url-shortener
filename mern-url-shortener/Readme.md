# Shortify - Intelligent URL Shortener

A full-stack URL shortening service built with the MERN stack (MongoDB, Express, React, Node.js) and Tailwind CSS v4. Features role-based access control, analytics tracking, and automated link categorization.

## 🚀 Key Features

* **Smart Categorization (Metadata Scraping):** Automatically categorizes shortened URLs (Technology, Entertainment, News, etc.) by scraping the target URL's `<title>` and `<meta>` tags on the backend using Cheerio.
* **Anonymous Usage via TTL Indexes:** Non-logged-in users can generate short links that are automatically purged from the database after 24 hours using MongoDB's Time-To-Live (TTL) indexing.
* **Role-Based Access Control (RBAC):** Secure JWT authentication isolating standard users to their personal dashboards, while granting Admins global visibility.
* **Custom Link Generation:** Users can define custom aliases or specify the exact character length of their randomized short links using Node's native `crypto` module.
* **Analytics & QR Integration:** Real-time click tracking and automatic QR code generation for every shortened link.
* **Modern UI/UX:** Fully responsive design built with Vite and Tailwind v4, including a Context-driven Dark/Light mode toggle.
* **High-Performance Caching**: The redirection endpoint utilizes node-cache for in-memory storage, drastically reducing database reads. Analytics tracking relies on non-blocking, atomic MongoDB $inc operations (fire-and-forget), ensuring instantaneous user redirection.

## 💻 Tech Stack

* **Frontend:** React, Vite, Tailwind CSS v4, Axios, React Router v6, Lucide Icons
* **Backend:** Node.js, Express, JSON Web Tokens (JWT), Bcrypt.js, Cheerio
* **Database:** MongoDB, Mongoose ODM

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/mern-url-shortener.git](https://github.com/yourusername/mern-url-shortener.git)