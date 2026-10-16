# SocietyHub - Smart Society Management System

SocietyHub is a comprehensive, production-ready Full-Stack MERN (MongoDB, Express, React, Node.js) application built to digitize residential society operations.

## Features

1. **Authentication & Roles**: Secure JWT authentication with strict Role-Based Access Control (RBAC).
2. **Complaint Management**: Complete pipeline from resident reporting to staff resolution.
3. **Visitor Management**: Pre-authorized gate entries with Security Staff enforcement.
4. **Maintenance & Payments**: Society billing and Razorpay-powered checkout flows.
5. **Finance Transparency**: Income and expense tracking.
6. **Society Events & RSVPs**: Event publishing and capacity-controlled RSVPs.
7. **Society Voting**: Democratic polls with strict one-vote enforcement.
8. **Community Issues**: Anonymous public feeds for community problem highlighting.
9. **Document Management**: Secure repository for society guidelines and notices.
10. **Repairs & Maintenance**: Administrative task delegation to Security/Staff.

## User Roles (Exactly 3)
1. **Resident**: Can only access and manage their own private data.
2. **Admin / Secretary**: Complete society management oversight.
3. **Security / Staff**: Gate operations and assigned administrative tasks.

## Technology Stack
- **Frontend**: React (Vite), React Router, Axios.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Mongoose).
- **Security**: Helmet, CORS, Express-Rate-Limit, bcrypt, JWT.
- **Integrations**: Razorpay (Payments), Cloudinary (File Uploads).

## Folder Structure
- `/client`: Frontend React application.
- `/server`: Backend Node/Express API.

## Environment Variables

### Backend (`server/.env`)
- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### Frontend (`client/.env`)
- `VITE_API_URL`

*(See `.env.example` in respective directories for setup)*

## Installation & Setup

1. **Clone and Install**
   ```bash
   # Backend
   cd server
   npm install

   # Frontend
   cd client
   npm install
   ```

2. **MongoDB Setup**
   Ensure MongoDB is running locally on port `27017` or update the `MONGO_URI` in `server/.env`.

3. **Cloudinary Setup (Optional but recommended)**
   Register at Cloudinary and place your keys in the backend `.env` for image uploads.

4. **Razorpay Test Setup**
   Place your Razorpay test keys in the backend `.env`. If using dummy keys, the application gracefully mocks the payment flow for offline testing.

## Running the Application

**Run Backend:**
```bash
cd server
npm run dev
```

**Run Frontend:**
```bash
cd client
npm run dev
```

## Running Tests
An automated end-to-end API test script is provided in the root directory.
```bash
node test-api.js
```

## Deployment Direction
For production deployment, ensure all placeholders in `.env` are replaced with strong production secrets. The backend can be hosted on platforms like Render or AWS EC2, and the frontend on Vercel or Netlify. Ensure CORS is strictly bound to the frontend domain.
