# Tripzio — Complete Product Roadmap
## Living Document — Updated April 2026

---

## Current Status

### ✅ Module 1 — COMPLETE
- Landing page, Auth (User + Agent)
- User Dashboard (Quick / Detailed / Custom Plan)
- Agent Dashboard
- Supabase DB with all tables

### ✅ Module 2 — COMPLETE (mostly)
- AI itinerary generation (OpenAI GPT-4o-mini)
- Weather integration (OpenWeatherMap)
- Hotels tab (Google Places + AI knowledge)
- Transport with real train names
- Destination Suggestions page (4 AI picks)
- Circuit / Multi-city Custom Plan
- WhatsApp share + Download

### 🔧 Module 2 — Pending fixes
- Circuit hotels (show per city, not just first)
- Circuit transport (show per leg)
- Trip Save / Unsave button
- Budget per person splitter
- 7-day weather forecast
- Back button fix (navigate -1)

---

## Module 3 — Monetisation + Agent Power
**Target: 4-6 weeks**

### Payments (Razorpay)
- Bronze / Silver / Gold / Diamond / Platinum subscriptions
- ₹0 / ₹499 / ₹999 / ₹1,999 / ₹4,999 per month
- Free tier: 3 itineraries/month
- Agent tier: ₹2,999/month

### Agent White-label
- Agent branding on PDF export
- Logo, contact number, custom colors
- "Presented by: Sharma Travels"
- WhatsApp share with agent branding

### Trip Sharing via Link
- Every trip gets unique URL: tripzio.io/trip/abc123
- View without login
- Save requires login
- Growth engine — word of mouth

### Email Verification
- OTP on registration
- WhatsApp OTP for agents

### My Trips Page
- All saved trips in beautiful cards
- Filter by destination, date, tier
- Re-open any past itinerary
- Delete trips

---

## Module 4 — Booking + Discovery
**Target: 6-8 weeks after M3**

### ONDC Integration
- Hotels bookable directly through Tripzio
- Transport tickets (bus/train) via ONDC
- Revenue: transaction commission
- India-first, government backed

### Explore Page
- Browse destinations by category
- Hill Stations / Beaches / Heritage / Adventure
- Trending this season
- Filter by budget, duration, state

### Nearby Experiences / Add-ons
- "Add to my trip" on each place card
- Itinerary updates automatically
- Cost estimate updates live
- Foundation for ONDC booking

### India Festival Calendar
- Auto-detect festivals on travel dates
- "Pushkar Camel Fair during your trip"
- Price warnings ("Book NOW, prices triple")
- Long weekend alerts

### Collaboration Mode (v1)
- Share planning session link
- Family/group can vote on destinations
- Majority wins → generate itinerary
- Solves the WhatsApp group chaos problem

---

## Module 5 — Databricks Intelligence
**Target: After M4, ~3 months**

### Azure Databricks Setup
- Bronze layer: Raw data ingestion
  - All generated itineraries
  - User behavior events
  - Weather patterns
  - Hotel pricing signals
- Silver layer: Cleaned, normalized
  - Destination knowledge graph
  - Budget-to-experience mapping
  - Seasonal patterns
- Gold layer: Intelligence
  - Personalization signals
  - Demand forecasting
  - Price trend data

### RAG Pipeline (replaces pure OpenAI)
- Vector Search on destination embeddings
- "Hill station like Manali but less crowded"
- Semantic retrieval of relevant context
- LLM generates grounded, accurate output
- No hallucinations — India-specific data

### MLflow Tracking
- Log every itinerary generated
- Track user ratings and saves
- Agent modification patterns
- Continuous improvement loop

### Seasonal Deal Alerts
- Monitor destination pricing signals
- "Darjeeling hotels 30% cheaper now"
- Festival window approaching alerts
- Long weekend notifications
- Re-engagement without ads

### Personalization Engine
- "Based on your Darjeeling trip..."
- Suggest next destination
- Budget pattern learning
- Trip type preference modeling

---

## Module 6 — Scale + Launch
**Target: After M5**

### Azure Deployment
- Docker containers
- Azure App Service (backend)
- Azure Static Web Apps (frontend)
- Azure CDN for images
- Custom domain: tripzio.io

### CI/CD Pipeline
- GitHub Actions
- Auto-deploy on merge to main
- Staging environment
- Rollback capability

### Performance
- Redis caching for weather/hotels
- Rate limiting on AI endpoints
- Response time < 2 seconds for non-AI
- AI generation < 15 seconds

### Legal & Compliance
- Privacy Policy page
- Terms of Service page
- Cookie consent banner
- "Powered by Google" attribution
- GST registration (when revenue > ₹20L)
- Razorpay KYC completion

---

## Module 7 — Go Live
**Target: After M6**

### Launch Checklist
- All pages mobile responsive ✓
- Error pages (404, 500)
- Loading states everywhere
- Email templates (welcome, trip saved)
- WhatsApp Business API
- App Store listing prep (React Native later)

### Marketing Foundation
- SEO meta tags on all pages
- Open Graph for trip sharing
- Google Analytics
- Hotjar for UX recording
- Referral program ("Invite a friend")

### Agent Onboarding
- Self-serve agent registration
- Agent verification flow
- Agent training video
- First 50 agents free for 3 months

---

## Features Backlog (Future)

### Voice Input for Custom Plan
- Microphone button on Custom Plan tab
- Web Speech API (free, browser native)
- Hindi / Bengali / English support
- Convert speech → text → AI plan

### Budget Splitter
- "How many people?" input
- Per-person cost breakdown
- Room sharing calculator
- "Bhai kitna dena hai" solver

### Weather Timeline (7-day)
- Forecast for actual travel dates
- Day-by-day weather cards
- "Carry umbrella for Day 3"
- OpenWeatherMap forecast API

### Trip Collaboration
- Real-time shared planning
- Vote on destinations / hotels
- Group budget pooling
- "5 people, ₹10K each = ₹50K trip"

### Mobile App
- React Native (shares 80% of React code)
- Push notifications
- Offline itinerary access
- Camera for destination photos

### B2B API
- White-label Tripzio API
- Travel agencies integrate in their apps
- Revenue: per-API-call pricing
- Opens enterprise market

---

## Database Schema — Current + Planned

### Current (Supabase)
```
users           — auth, profile, role
trips           — generated itineraries (JSON)
agent_clients   — agent CRM
saved_destinations
subscriptions
```

### Planned additions
```
trip_shares     — public share links
trip_saves      — user bookmarks  
notifications   — deal alerts, reminders
agent_brands    — white-label config
reviews         — user trip reviews
festivals       — India festival calendar
destinations    — curated destination data
```

---

## Revenue Model

### B2C Subscriptions
```
Free      ₹0        3 itineraries/month
Silver    ₹499      20 itineraries/month
Gold      ₹999      Unlimited + PDF export
Diamond   ₹1,999    + Agent features lite
Platinum  ₹4,999    + White-label + Priority
```

### B2B Agent Plans
```
Starter   ₹999/mo   1 agent, 50 trips/mo
Pro       ₹2,999/mo 1 agent, unlimited + branding
Agency    ₹7,999/mo 5 agents, full white-label
Enterprise Custom    API access + dedicated support
```

### Transaction Revenue (Module 4+)
```
Hotel bookings    8-12% commission (Booking.com affiliate)
ONDC bookings     2-5% platform fee
Activity bookings 10-15% commission
```

### Projected Revenue
```
Month 6:   100 users × ₹499 avg = ₹49,900/mo
Month 12:  500 users × ₹699 avg + 50 agents × ₹2,999 = ₹4,99,400/mo
Month 24:  5,000 users + 500 agents + ONDC = ₹50L+/mo
```

---

## Tech Stack — Current + Planned

### Current
```
Frontend    React + Vite
Backend     FastAPI (Python)
Database    Supabase (PostgreSQL)
AI          OpenAI GPT-4o-mini
Weather     OpenWeatherMap
Hotels      Google Places API
```

### Planned additions
```
Payments    Razorpay
Cache       Redis (Azure Cache)
Analytics   Databricks + MLflow
Search      Databricks Vector Search
Hosting     Azure (App Service + Static Web Apps)
CDN         Azure CDN
Email       SendGrid
WhatsApp    Meta Business API
Monitoring  Azure Application Insights
CI/CD       GitHub Actions
```

---

## Immediate Next Steps (This Week)

### Today — Circuit fixes
1. Hotels tab — per city sections
2. Transport tab — per leg sections
3. Fix applies to N destinations

### This week — Quick wins
4. Trip Save button on ItineraryResult
5. My Trips page (basic)
6. Budget per person display
7. 7-day weather forecast
8. Voice input on Custom Plan

### Next week — Module 3 starts
9. Razorpay integration
10. Subscription tiers
11. Trip sharing via link
12. Agent PDF with branding

---
*Last updated: April 2026*
*Version: 2.0*
