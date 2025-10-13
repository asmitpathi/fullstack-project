# 📦 TwiTube

TwiTube is a backend server application inspired by the **Chai aur Backend** series by *Hitesh Choudhary*.  
It brings together features of both **Twitter** and **YouTube** — enabling authentication, video uploads, playlists, tweets, likes, subscriptions, and a detailed channel dashboard.

Built with **Node.js**, **Express.js**, and **MongoDB**, this project serves as a complete backend solution for a social + video platform.

---

## 📁 Project Structure

```text
root/
├── public/               # Static assets (uploaded videos, etc.)
│   └── temp/
├── src/
│   ├── controllers/      # Handles route logic
│   ├── models/           # Mongoose schemas
│   ├── middlewares/      # Auth, error handling, async utilities
│   ├── constants/        # Global constants
│   ├── DB/               # Database connection config
│   ├── utils/            # Helper functions
│   ├── routes/           # Route files (videos, tweets, likes, etc.)
│   ├── app.js            # Express app setup
│   └── index.js          # Server entry point
├── .env
├── .gitignore
├── package.json
└── README.md

---

### 🚀 Features

- ✅ **JWT-based authentication**  
- ✅ **Video CRUD** + owner info via aggregation  
- ✅ **Commenting system** with pagination  
- ✅ **Tweet system** (post, edit, delete)  
- ✅ **Likes system** (for videos & comments)  
- ✅ **Subscriptions** (toggle-based)  
- ✅ **Playlist management** (create, update, delete, fetch)  
- ✅ **Channel dashboard stats** (views, likes, videos, subs)  
- ✅ **All routes tested via Postman**

---

## 🧰 Tech Stack

**Backend:** Node.js, Express.js  
**Database:** MongoDB + Mongoose  
**Authentication:** JWT (Access Tokens)  
**Environment:** ES Modules (`type: "module"`)  
**Others:**  
- mongoose-aggregate-paginate-v2  
- dotenv  
- custom error handling  
- asyncHandler  

---

## 🔐 Environment Variables

Create a `.env` file in the root folder and add the following:

```env
MONGO_URI=your_mongo_url
PORT=your_port
CORS_ORIGIN=*
ACCESS_TOKEN_SECRET=your_access_token
ACCESS_TOKEN_EXPIRY=your_expiry_time
REFRESH_TOKEN_SECRET=your_refresh_token
REFRESH_TOKEN_EXPIRY=your_expiry_time
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
