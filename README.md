# 🚗 RydSET: The Exclusive Campus Carpooling Network

RydSET is a premium, purpose-built carpooling platform designed exclusively for the **Rajagiri School of Engineering & Technology (RSET)** community. It bridges the gap between drivers with empty seats and passengers looking for a reliable, eco-friendly commute. 

By prioritizing security, user experience, and campus exclusivity, RydSET modernizes the daily commute while fostering a stronger, more connected university community.

---

## 🌟 The Vision

Campus parking is limited, daily commuting can be expensive, and environmental sustainability is more important than ever. RydSET was built to solve these challenges by creating a closed, trusted network where students and faculty can share rides effortlessly. 

Our goal is to reduce the carbon footprint of our campus, alleviate traffic congestion, and provide a secure networking opportunity during the daily commute.

---

## ✨ Core Features

### 🔐 Exclusive & Secure Ecosystem
- **Domain-Restricted Access**: Registration is strictly limited to users with active `@rajagiri.edu.in` email addresses, ensuring that every user is a verified member of the campus.
- **Automated Verification**: The system intelligently categorizes users (Students vs. Faculty) and requires administrative approval for all driver applications.
- **Vehicle Verification**: Drivers must register their vehicle details (Model, Registration Number, License), which are tied to their profile for transparency and safety.

### 🚘 Intelligent Ride Matching
- **Dynamic Ride Creation**: Drivers can effortlessly schedule rides, specifying pickup/dropoff points, departure times, and available seating capacity.
- **Real-Time Booking**: Passengers can search for active routes, request seats, and receive instant confirmations.
- **Automated Inventory Management**: The platform handles seat allocation in real-time, instantly decrementing available seats upon booking and refunding them if a ride or request is cancelled.

### 💬 Seamless Coordination
- **In-App Messaging**: Passengers and drivers can coordinate pickup details through a secure, built-in chat interface without exchanging personal phone numbers.
- **Status Tracking**: Both parties have access to a real-time "My Trips" dashboard to track the status of their rides (Pending, Accepted, Started, Completed, or Expired).

### 🛡️ Safety & Accountability
- **OTP Verification**: Rides require a 6-digit passenger OTP to officially commence, ensuring accountability and confirming that the correct passenger has boarded.
- **Community Rating System**: A post-ride review and rating system maintains high standards of conduct for both drivers and passengers.

---

## 🎨 Design Philosophy

RydSET abandons the generic, utilitarian look of traditional transit apps in favor of a **premium, dynamic user interface**. 

- **Aesthetic**: A sophisticated "Emerald & Pearl" color palette creates a clean, trustworthy environment.
- **Glassmorphism & Depth**: Strategic use of frosted glass effects, deep shadows, and rounded interfaces provide a modern, tactile feel.
- **Micro-Interactions**: The application feels alive, utilizing smooth Framer Motion animations for page transitions, dynamic state changes, and responsive layout shifts.
- **Typography**: Powered by the "Outfit" font family, delivering high readability with a modern, technical edge.

---

## 🚀 Technical Architecture

RydSET is built on a robust, modern technology stack designed for scale and real-time performance.

- **Frontend**: React 18, Vite, and Tailwind CSS deliver a lightning-fast, fully responsive Single Page Application (SPA).
- **Backend Infrastructure**: Powered by **Firebase**.
  - **Firestore**: A highly scalable NoSQL cloud database handles real-time data synchronization across all clients.
  - **Firebase Authentication**: Manages secure user identities and domain restrictions.
  - **Cloud Storage**: Securely stores user avatars and vehicle verification documents.
- **Security**: Granular Firestore Security Rules ensure that users can only access and modify data they own, providing strict data isolation between users.
- **Mapping & Routing**: Integrates interactive maps and routing APIs for precise pickup and dropoff coordination.

---

## 🔮 Upcoming Features

- **AI-Powered Vehicle Verification**: An automated pipeline using cutting-edge Vision AI to perform OCR on Registration Certificates (RC) and match them against vehicle photos. This will eliminate the need for manual admin approvals and provide instant verification for drivers.

---

*RydSET — Coordination is the key to perfect carpooling.*
