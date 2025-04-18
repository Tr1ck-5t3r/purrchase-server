# 🐾 Purrchase Server API

## Introduction

A Node.js and Express-based backend server for a pet adoption platform. This server handles user authentication, pet listings, wishlist management, profile updates, and Razorpay-integrated pet adoption payments.

## 🚀 Features

- 🐶 View Pets (All, by ID, or Latest Gallery)
- 👤 User Registration & Login (JWT Auth)
- 📝 Update Profile
- ❤️ Wishlist Functionality (Add/Remove)
- 🛒 Adopt Pets (Razorpay Integration)
- 🔒 Token-based Authentication Middleware
- 📦 MongoDB Models: User, Pet, Wishlist, Order

## 🛠️ Tech Stack

- Backend: Node.js, Express.js
- Database: MongoDB (via Mongoose)
- Authentication: JWT + Bcrypt
- Payments: Razorpay API
- Environment Management: dotenv

## 📁 Project Structure

📦server \
 ┣ 📂models \
 ┃ ┣ 📜User.js \
 ┃ ┣ 📜Pet.js 
 ┃ ┣ 📜Wishlist.js
 ┃ ┗ 📜Orders.js
 ┣ 📜routes.js      ← Main server routes (your code)
 ┣ 📜server.js      ← Express server entry point
 ┗ 📜.env           ← Environment variables

## 📦 Installation

```bash
git clone https://github.com/Tr1ck-5t3r/purrchase-server
cd purrchase-server
npm install
```

## ⚙️ Environment Variables

Create a .env file and add:

```env
MONGO_URI=
JWT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
URL=<frontend_url>
```

## ▶️ Running the Server

```bash
npm start
```

Server will be running on <http://localhost:5000>