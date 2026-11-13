# ChefConnect – Online Chef Booking Platform

A full-stack web platform enabling customers to book professional verified chefs for at-home cooking, family functions, birthday parties, weddings, and festival catering. Customers book a chef's cooking service (the chef cooks live on-site with either customer-provided groceries or chef-sourced ingredients), not food delivery.

---

## 🎨 Brand Palette
- **Deep Green:** `#173D2E`
- **Warm Cream:** `#FFF8EC`
- **Golden Yellow:** `#D9A441`
- **White:** `#FFFFFF`

---

## 🚀 Key Features & Portals

### 1. Customer Portal
- **Authentication:** Customer sign up and login with password show/hide functionality and profile management.
- **Find a Chef:** Search and filter by cuisine specialty (Sweets & Laddu, Traditional Andhra, Dum Biryani, etc.), location, hourly budget, and availability.
- **Chef Profiles:** Ratings, verified background check badges, signature dishes with prep times, and available calendar slots.
- **Cooking Requirements Form:**
  - Event type: Home cooking, birthday, wedding, festival, family function, or corporate.
  - Food category: Vegetarian, non-vegetarian, sweets, snacks, traditional.
  - Dynamic itemized menu & quantities (e.g., 10 kg Besan Laddu, 50 meals Biryani).
  - Ingredient arrangement: Customer-provided (₹0 extra) vs. Chef-provided (chef purchases raw ingredients).
  - Utensils & kitchen equipment checklist.
  - Venue address, dietary restrictions, and kitchen notes.
  - Live transparent pricing breakdown (Chef service fee + ingredient estimate + 10% platform fee + advance deposit).
- **Payment & Receipts:** Razorpay test mode payment gateway simulation, instant receipt generation, booking ID assignment.
- **Customer Dashboard:** Status stepper tracking (Requested → Quoted → Confirmed → Cooking → Completed), payment history, ratings & reviews submission, and direct chef contact.

### 2. Chef Portal
- **Chef Registration:** Details on culinary specialties, experience years, service areas, base & hourly rate, and working hours. New registrations remain **Pending Approval** until admin verification.
- **Chef Dashboard:** Manage incoming booking requests, customize quotations (adjust hours, service fee, travel/equipment surcharge), accept or decline requests.
- **Service Execution:** Mark bookings as "Cooking Started" upon arrival and "Completed" upon kitchen cleanup.
- **Earnings Ledger:** Total net earnings, average ticket size, and weekly payout schedules.
- **Double-Booking Prevention:** Smart calendar overlap detection prevents double booking for the same time slot.

### 3. Admin Portal
- **Platform Analytics:** Real-time metrics on gross bookings, platform commission revenue, customer count, and active chefs.
- **Chef Onboarding & Approvals:** Review and approve or reject pending chef applications with 1 click.
- **Master Booking Registry:** Filter and inspect all bookings across the platform by status.
- **Financial Audit & Refunds:** Detailed gateway transaction ledger with receipt IDs and refund management.
- **Commission & Policy Control:** Configure platform take rate (e.g. 10%) and cancellation policy rules.
- **Database Migration:** In-app viewer and copyable SQL migration for PostgreSQL / Supabase.

---

## 🗄️ Database Architecture (`src/db/schema.sql`)

The application schema includes 10 PostgreSQL tables with Row Level Security (RLS) policies:
1. `profiles`: User accounts, contact details, role (`customer`, `chef`, `admin`), addresses.
2. `chefs`: Culinary bio, hourly rate, base charge, rating, approval status (`pending`, `approved`, `rejected`), service areas.
3. `chef_availability`: Working hours, operating days, and blocked dates.
4. `cooking_categories`: Specialties, popular regional dishes, and icons.
5. `cooking_services`: Custom packages and service tiers.
6. `bookings`: Master booking record storing event scale, venue address, ingredient choices, service fees, advance deposits, and status.
7. `booking_items`: Specific dishes, quantities, and units (kg, plates, etc.).
8. `booking_payments`: Transaction records, Razorpay order/payment IDs, receipt numbers, and refund details.
9. `notifications`: In-app notifications for booking requests, quotation updates, and payment receipts.
10. `reviews`: Customer ratings for taste, cleanliness, and punctuality with reviews.

---

## 🛠️ Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_RAZORPAY_KEY_ID="rzp_test_1DP5mmOlF5G5ag"
RAZORPAY_KEY_SECRET="your_test_secret"
APP_URL="http://localhost:3000"
```

### 3. Run Unit Tests
```bash
npx --yes tsx --test src/utils/pricing.test.ts src/utils/bookingWorkflow.test.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

---

## 📦 Deployment Instructions

1. **Deploy to Cloud Run / Vercel / Netlify:**
   ```bash
   npm run build
   ```
2. **Apply Database Migrations:**
   - Open your Supabase Dashboard -> **SQL Editor**.
   - Copy the contents of `src/db/schema.sql` and run it.
   - Row Level Security (RLS) is automatically enabled with secure role policies.
