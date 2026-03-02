# 🚗 RSET RideShare

A premium, production-ready carpooling platform designed exclusively for the **Rajagiri School of Engineering & Technology (RSET)** community. Connect with peers, reduce campus traffic, and save on your daily commute.

---

## ✨ Key Features

### 🔐 Secure & Exclusive Access
- **Domain Restriction**: Only `@rajagiri.edu.in` email addresses are permitted for registration, ensuring a verified campus-only environment.
- **Automated Profiles**: User profiles (Student/Staff) are automatically generated upon signup via database triggers.

### 🚘 Ride Management
- **Offer a Ride**: Drivers can list rides with specific sources, destinations, dates, times, and available seats.
- **Real-time Search**: Passengers can search for rides based on their route.
- **Visual Dashboard**: A clean, glassmorphic interface to browse and manage rides.

### 🛡️ Booking & Security
- **OTP Verification**: Secure 2-step booking process. A 6-digit code is required to confirm a seat, ensuring both parties are committed.
- **Intelligent Seat Management**: Available seats are automatically decremented on confirmation and **fully restored** if a booking is cancelled or deleted.
- **Row-Level Security (RLS)**: Deep database-level protection ensuring users can only modify their own data and private booking details.

### 🎨 Premium UI/UX
- **Emerald & Pearl Aesthetic**: A vibrant, modern theme featuring a clean white background with deep emerald green accents.
- **Cascading Brand Identity**: A monumental, animated "RYDSET" logo that greets users with a beautiful cascading motion.
- **Modern Typography**: High-end typography using the "Outfit" font family for maximum readability and prestige.
- **Glassmorphic Elements**: Subtle glass effects on the Navbar and interaction cards.
- **Micro-interactions**: Refined hover effects, smooth exit/entrance animations, and responsive layout transitions.

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend & Auth**: Supabase (PostgreSQL, GoTrue)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Styling**: Vanilla CSS + Tailwind Utility Classes

---

## 🛠 Setup & Installation

### 1. Database Setup
1. Create a new project on [Supabase](https://supabase.com/).
2. Open the **SQL Editor** and run the entire `schema.sql` file to initialize tables, RLS policies, and triggers.

### 2. Local Development
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

- `/src/pages`: Main application views (Dashboard, Login, CreateRide, etc.)
---

## 🛠 Going to Production

To move from the current **Deliverable Demo** to a fully live version, follow these steps:

### 1. Real OTP Setup (Email)
- **Service**: Sign up for [Resend](https://resend.com/).
- **Supabase**: Deploy a Supabase Edge Function that uses the Resend API.
- **Frontend**: In `Dashboard.jsx`, replace the random code generation with a call to `supabase.functions.invoke('send-otp')`.

### 2. Real Payments
- **Integration**: Add the Stripe/Razorpay React SDK.
- **Backend**: Replace the `setTimeout` in `MyBookings.jsx` with a real payment intent confirmation call and a Supabase webhook to update `payment_status` to `paid`.

### 3. Maps API
- **Current**: Using public OSRM (standard for development).
- **Production**: Sign up for **Mapbox** or **Google Maps Platform** for higher reliability and faster routing in `MapPicker.jsx`.
