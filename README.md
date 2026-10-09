# Viveha AI

Viveha AI is a comprehensive B2B Billing and Invoicing platform featuring a mobile application frontend and a robust backend API.

## Project Structure

This is a monorepo containing the following main components:

- **`/server`**: The Backend API built with Node.js, Express, and MongoDB.
- **`/App`**: The mobile frontend built with React Native and Expo.

---

## 1. Backend (Server)

The backend provides a RESTful API for the billing system.

### Tech Stack
- **Node.js & Express**: API routing and server logic.
- **MongoDB & Mongoose**: Database and ODM.
- **JWT & bcrypt**: Authentication and secure password hashing.
- **Nodemailer**: Email sending for invoices and notifications.
- **Multer**: File upload handling.

### Running the Backend

```bash
cd server
npm install
# Start in development mode with nodemon
npm run dev
# Start in production mode
npm start
```

### Docker deployment

To build and push the docker image for the backend:

```bash
docker buildx build --platform linux/amd64 -t sharathbalan/viveha-backend-dev:latest --push .
```

---

## 2. Mobile App (Frontend)

The frontend is a cross-platform mobile application for managing billing, invoicing, and generating receipts on the go.

### Tech Stack
- **React Native & Expo**: Cross-platform mobile app development framework.
- **Axios**: HTTP client for communicating with the backend.
- **React Navigation**: App navigation.
- **Async Storage**: Local offline data caching.
- **Expo Print & Sharing**: Generating PDF invoices/receipts and sharing them.
- **React Native Chart Kit**: Displaying analytics and charts.
- **QR Code**: Generating and handling QR codes.

### Running the App

```bash
cd App
npm install
# Start Expo development server
npm start
```
You can then run it on an Android or iOS emulator, or on a physical device using the Expo Go app.

---

## Offline Support
The mobile application is designed to support offline capabilities, caching data using `AsyncStorage` and ensuring smooth operations even in environments with poor network connectivity. See `App/OFFLINE_SUPPORT_README.md` for more details.
