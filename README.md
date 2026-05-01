# FixMate Backend

FixMate is a robust service-based platform connecting customers with professional service workers. This backend provides API endpoints for authentication, service management, worker location-based matching, booking management, and platform analytics.

## Features

- **Authentication**: Role-based access control (User, Worker, Admin).
- **Service Management**: Admin-controlled service catalog.
- **Worker Matching**: Geo-spatial search for nearby workers based on skills.
- **Booking Lifecycle**: End-to-end booking flow from creation to completion.
- **Reviews & Ratings**: Feedback system for service workers.
- **Admin Dashboard**: Platform-wide statistics and management.

## Tech Stack

- **Node.js**: Runtime environment.
- **Express**: Web framework.
- **MongoDB**: Database (with Mongoose).
- **JWT**: Secure authentication.
- **Bcrypt.js**: Password hashing.
- **Jest & Supertest**: Automated testing framework.

## Getting Started

### Prerequisites

- Node.js installed.
- MongoDB instance (local or Atlas).

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   ```

### Running the Server

- Development mode:
  ```bash
  npm run dev
  ```
- Production mode:
  ```bash
  npm start
  ```

## Testing

### Automated Tests
Run the comprehensive test suite using Jest:
```bash
npm test
```

### Manual API Tests
A legacy manual testing script is available:
```bash
node test-api.js
```
*Note: Ensure the server is running on port 5000 before running manual tests.*

## API Documentation

Detailed API documentation can be found in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).
