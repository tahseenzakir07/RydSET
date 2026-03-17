# RydSET Architecture & Build Guide

Welcome to the RydSET codebase! This document serves as a comprehensive guide to understanding how RydSET was built, its architecture, and the primary functions and modules that power it.

## 🌟 Tech Stack Overview

- **Frontend Framework:** React 18 with Vite
- **Routing:** React Router v6 (`react-router-dom`)
- **Styling:** Tailwind CSS combined with Vanilla CSS (for custom utility classes and animations)
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Maps & Routing:** Leaflet (`react-leaflet`, `leaflet`) and OpenStreetMap/OSRM APIs
- **Backend & Database:** Firebase (Authentication and Firestore)
  - *(Note: Initially planned with Supabase as per `PROJECT_DETAILS.md`, the app currently uses Firebase for its core backend operations).*

---

## 📂 Project Structure

```text
src/
├── components/       # Reusable UI elements (Navbar, Modals, MapPicker, etc.)
├── contexts/         # Global State Management (AuthContext)
├── lib/              # Core integrations (firebase.js)
├── pages/            # Main application views/routes
├── App.jsx           # Application shell & Routing config
├── main.jsx          # React entry point
└── index.css         # Global Styles & Tailwind config
```

---

## 🧩 Core Modules & Functions

### 1. `src/App.jsx` - The Application Shell
This is the heart of the routing logic. It wraps the entire app in the Context Providers (`<AuthProvider>`) and defines all routes using `react-router-dom`.
- **`PrivateRoute` Component:** A specialized wrapper function used inside `App.jsx` that checks if a user is authenticated. If they are not, it redirects them to the `/login` page using the `<Navigate>` component.

### 2. `src/lib/firebase.js` - Backend Configuration
Initializes the Firebase App and exports the `auth` and `db` (Firestore) instances used throughout the application. It explicitly pulls configuration from the `.env` variables using Vite's `import.meta.env`.

### 3. `src/contexts/AuthContext.jsx` - State Management
Manages global user authentication state.
- **`AuthProvider` Element:** Wraps the entire application.
- **`onAuthStateChanged` hook:** Listens to Firebase Auth changes to detect logins/logouts in real-time.
- **`fetchProfile(uid)`:** A function that fetches the custom user profile document from the `profiles` Firestore collection when a user logs in. It includes a retry mechanism in case the profile takes time to be created by the backend triggers.
- **`useAuth()`:** A custom hook exported to allow any component to easily access `user`, `profile`, `loading` state, and `signOut` functionality.

---

## 📄 Main Pages (`src/pages/`)

### 1. `Dashboard.jsx` (Find a Ride / Passenger View)
The primary screen for passengers to find available rides.
- **`fetchRides()`:** Queries the `rides` collection in Firestore for upcoming rides (`status == 'planned' || 'started'`). It filters out expired rides (older than 12 hours) and rides with 0 seats available.
- **`filteredRides` Logic:** A frontend filtering mechanism that checks the user's search inputs (Source, Destination, Date, Time) against the active rides. It uses both text matching and spatial coordinate matching (via a 5km radius check using the `getDistance` Haversine formula).
- **`JoinRideModal` Component:** 
  - **`geocode()` & `fetchRoute()`:** Calls the `nominatim.openstreetmap.org` API to geocode addresses and uses OSRM (`router.project-osrm.org`) to calculate the exact distance between the passenger's custom pickup and drop-off points.
  - **`requestJoin()`:** Creates a new document in the `bookings` collection with `status: 'pending'`, sending a visual request to the driver.

### 2. `CreateRide.jsx` (Offer a Ride / Driver View)
Allows verified drivers to post their commute.
- **Verification Flow:** Immediately checks `profile.driver_status`. If not `'approved'`, it blocks access and prompts the user to visit their profile to register their vehicle.
- **`handleLocationChange()` & `MapPicker` Component:** Integrates with Leaflet. Drivers can drag pins on a map to select exact coordinates for Source and Destination.
- **`handleSubmit()`:** Validates the selected time (preventing past date selection) and adds a new document to the `rides` Firestore collection containing driver info, route coordinates, vehicle type, seats, and price.

### 3. `MyBookings.jsx` & `AdminDashboard.jsx` (Brief Overview)
- **`MyBookings.jsx`:** Shows drivers their offered rides (and pending passenger requests to accept/reject via OTP) and shows passengers the status of their requests.
- **`AdminDashboard.jsx`:** A restricted view where admins can approve or reject driver vehicle registrations.

---

## 🛠 How The App Works (The Data Flow)

1. **Authentication:** User logs in via the `Login.jsx` screen (Firebase Auth).
2. **Profile Generation:** A Firestore record is either created or fetched for that user in the `profiles` collection. The `AuthContext` makes this data available app-wide.
3. **Driver Flow (Create Ride):**
   - The user goes to `/create-ride`.
   - They specify details and use Leaflet mapping to generate `from_lat`/`from_lng`.
   - A `rides` document is published to Firestore.
4. **Passenger Flow (Find Ride):**
   - The user navigates to `/dashboard`.
   - `fetchRides()` pulls active rides from Firestore.
   - User requests to join a ride: a `bookings` document is created in Firestore with a `'pending'` status.
5. **Confirmation & OTP Flow:**
   - The driver accepts the booking in `MyBookings.jsx`. The booking status changes to `'accepted'`.
   - Passengers and drivers then go through an OTP verification process to mark the ride as completely confirmed, simultaneously decrementing available seats on the ride document safely.

---

## 🎨 UI / UX Implementation Secrets

- **Glassmorphism:** You'll see `.glass` utilities or `bg-white/50 backdrop-blur-md` used frequently across cards and navbars to create an iOS-like frosted glass look.
- **Framer Motion (`motion.div`):** Used on almost all page load scenarios to add subtle slide-up and fade-in effects (`initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`).
- **Responsive Navigation:** The `Navbar.jsx` hides on small screens and is replaced by `MobileNav.jsx`, which acts as a bottom app-style tab bar.

## 🏁 How to continue development
To run this application locally, you just need to:
1. Run `npm install`
2. Ensure the `.env` file is populated with your Firebase credentials (`VITE_FIREBASE_API_KEY`, etc.).
3. Run `npm run dev`

Happy Coding!
