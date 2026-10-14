# Bangladesh Smart Travel Planner & Tour Agent Management System

A full-stack, responsive, database-driven travel planning and tour agent booking web application designed for **Bangladesh**. Built with **Node.js, Express.js, EJS, MySQL (`mysql2`), Bootstrap 5, and Chart.js** following a strict layered **MVC + Service Architecture**.

---

## Core Features

1. **Manual Travel Cost Management (Admin Dashboard)**
   - Full CRUD, search, and filtering for Destinations, Tourist Attractions, Bus/Train/Launch/Private Car Fares, Hotels & Nightly Room Types, Daily Food Meal Tiers, Local Transport/Boat Trips, and Tour Packages.
   - Displays `last_updated_at` timestamps and clearly labels prices as **Estimated** unless marked **Verified**.
   - Supports **CSV Export and Bulk CSV Import** for transportation fares, food costs, and additional expenses.

2. **Rule-Based Budget Recommendation Engine & Cost Calculator**
   - Implements the exact server-side formula:
     `Total Trip Cost = Transportation + Accommodation + Food + Local Transportation + Activities + Agent Fees + Additional Expenses`
   - Automatically calculates trip days, hotel nights, required hotel rooms (`ceil(travelers / max_guests_per_room)`), shared vehicle vs. per-person ticket costs, and per-traveler costs in **Bangladeshi Taka (৳ BDT)**.
   - Generates and ranks multiple itinerary tiers (*Your Exact Preferences*, *Budget Saver*, *Balanced Standard*, *Premium Experience*), prioritizing plans that fit within the user's budget and clearly reporting the exact **Budget Surplus** or **Budget Deficit**.

3. **Tour Agent Discovery & Conflict-Free Date Filtering**
   - Filters tour agents by Destination, Departure Date, Return Date, Group Capacity, Maximum Service Fee, Tour Type, Services Offered, Language, and Rating.
   - Automatically excludes agents who have an overlapping **Confirmed Booking** (`departure_date <= requestedReturn AND return_date >= requestedDeparture`) or an overlapping **Unavailable** calendar block.
   - Uses MySQL transactions with `SELECT ... FOR UPDATE` row locking when confirming bookings to prevent double-booking race conditions.

4. **13 Pre-Seeded Bangladesh Destinations**
   - Includes demonstration data for: **Cox's Bazar, Saint Martin's Island, Sylhet, Sajek Valley, Bandarban, Rangamati, Sundarbans, Kuakata, Srimangal, Dhaka, Rajshahi, Paharpur, and Bagerhat**.

---

## Prerequisites & Requirements

- **Node.js**: `v18.0.0` or higher (includes native `node --test` runner)
- **npm**: `v9.0.0` or higher
- **MySQL Server**: `v8.0` or higher (or MariaDB `10.6+`)

---

## Step-by-Step Local Setup Instructions

### 1. Install Dependencies
```bash
npm install