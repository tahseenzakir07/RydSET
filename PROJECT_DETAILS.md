# RydSET Project Documentation

A production-ready carpooling platform exclusively for **Rajagiri School of Engineering & Technology (RSET)** students and staff.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: [React 18](https://reactjs.org/) (JavaScript)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Styling
- **CSS Framework**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Utility Tools**:
  - `clsx` & `tailwind-merge` (Conditional class management)
  - `autoprefixer` & `postcss`

### Backend & Database
- **Platform**: [Supabase](https://supabase.com/)
- **Features Used**:
  - **PostgreSQL Database**: Relational storage for users, rides, and bookings.
  - **Authentication**: Built-in GoTrue auth with email/password.
  - **RLS (Row Level Security)**: Secure data access control at the database level.
  - **Triggers/SQL Functions**: Automated logic for seat management and profile creation.

---

## 🛠 Project Structure

```text
RydSET/
├── src/
│   ├── components/       # Reusable UI components (Navbar, etc.)
│   ├── contexts/         # React Context API (AuthContext for user state)
│   ├── lib/              # Library configurations (Supabase client)
│   ├── pages/            # Page-level components
│   │   ├── Home.jsx      # Landing Page
│   │   ├── Login.jsx     # Login/Join Page
│   │   ├── Dashboard.jsx # User Dashboard (Ride management)
│   │   ├── CreateRide.jsx# Form to offer a ride
│   │   └── MyBookings.jsx# Passenger booking view
│   ├── App.jsx           # Main application shell and routing
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles & Tailwind directives
├── schema.sql            # Database schema and RLS policies
├── tailwind.config.js    # Tailwind configuration
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies and scripts
```

---

## ✨ Key Features

### 1. Secure Authentication
- **Domain Restriction**: Enforces registration only for `@rajagiri.edu.in` email addresses.
- **Auto-Profile Creation**: Database triggers automatically create a user profile upon registration.

### 2. Ride Management
- **Offer a Ride**: Drivers can list rides with details like destination, date, time, and available seats.
- **Search & Join**: Users can browse available rides and request to join.
- **Dashboard**: Centralized view for drivers to manage their offered rides and for passengers to see their bookings.

### 3. Security & Integrity
- **Seat Management**: Real-time tracking of available seats. Seat count decrements automatically when a booking is confirmed.
- **RLS Policies**: 
  - Drivers can only modify their own rides.
  - Profiles are publicly readable (for names) but only editable by the owner.
  - Bookings are private to the driver and the passenger.
- **Atomic Transactions**: Uses SQL triggers to ensure data consistency during bookings (prevents overbooking).

---

## 📋 Setup & Deployment

1. **Environment Variables**:
   Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a `.env` file.
2. **Database Setup**:
   Requires running `schema.sql` in the Supabase SQL Editor to initialize tables and policies.
3. **Local Development**:
   ```bash
   npm install
   npm run dev
   ```
4. **Build**:
   ```bash
   npm run build
   ```

---

## 📈 Future Enhancements (Ideas)
- Real-time chat between driver and passenger.
- Integrated map view for route visualization.
- Rating and review system for users.
- Push notifications for booking updates.
