# Job Hunt Management System - Project Context

## 🎯 **Project Overview**

A comprehensive full-stack application for managing the entire job hunting process, from networking to offer acceptance.

### **Purpose**
Job hunting is complex and requires tracking multiple parallel processes:
- Maintaining relationships with contacts
- Tracking job applications through stages
- Managing outreach and follow-ups
- Measuring CV quality and response rates
- Scheduling interviews and events
- Tracking referrals and code reviews

This system centralizes all these activities in one place.

---

## 📊 **Core Modules**

### **1. Jobs** 🎯
Track job applications from discovery to offer.

**Key Features**:
- Multi-stage pipeline (Applied → Screening → Interview → Offer)
- Heat scoring (signal-based 0–100 score mapped to a 0–3 badge)
- CV tailoring score tracking
- Status history timeline

**Why It Matters**: Never lose track of an application, know which jobs need attention.

---

### **2. Contacts** 👥
Manage your professional network.

**Key Features**:
- Store contact info (email, phone, LinkedIn, GitHub)
- Associate with companies
- Track relationship strength (Weak/Medium/Strong)
- View complete interaction timeline
- Categorize with tags

**Why It Matters**: Your network is your most valuable job-hunting asset.

---

### **3. Companies** 🏢
Normalized company data (no duplicate strings).

**Key Features**:
- Auto-deduplicate by name
- Link contacts and jobs
- Track domain and LinkedIn page

**Why It Matters**: Consistency across the system, better analytics.

---

### **4. Outreach** 📧
Track all communication attempts.

**Key Features**:
- Multiple channels (Email, LinkedIn, Phone)
- Personalization scoring
- Outcome tracking (Positive/Negative/No Response)
- Links to jobs and contacts

**Why It Matters**: Measure what works, know when to follow up.

---

### **5. Referrals** 🤝
Track referrals received from contacts.

**Key Features**:
- Different kinds (Intro, Referral, Sent CV)
- Links referral to job and contact
- Auto-promotes contact strength on successful referral

**Why It Matters**: Referrals 3-5x your chances of getting an interview.

---

### **6. Code Reviews** 💻
Track senior engineers reviewing your projects.

**Key Features**:
- Link to contact and project
- Quality score (0-100)
- Review summary notes

**Why It Matters**: Shows initiative, builds relationships with seniors.

---

### **7. Events** 🎪
Track networking events and meetups.

**Key Features**:
- Attendance tracking
- Target conversation goals
- Link contacts met at events

**Why It Matters**: Conferences and meetups are goldmines for contacts.

---

### **8. Follow-Ups** ⏰
Automated reminders for actions.

**Key Features**:
- Links to jobs or contacts
- Due date tracking
- Attempt counting

**Why It Matters**: Persistence wins in job hunting - never forget to follow up.

---

### **9. KPIs & Dashboard** 📈
Track daily and weekly metrics.

**Key Metrics**:
- CVs sent (today / this week)
- Outreach attempts
- Follow-ups sent
- Events attended
- Boost tasks completed

**Why It Matters**: What gets measured gets done.

---

## 🏗️ **Technology Stack**

### **Backend**
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT (single-user system)

### **Frontend**
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand + React Query
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Forms**: react-hook-form + Zod

### **Infrastructure**
- **Dev Server**: Vite dev server (port 5173/5174)
- **API Server**: NestJS (port 3001)
- **Database**: PostgreSQL (port 5432)

---

## 🎨 **Design Principles**

### **1. Single-User Focus**
- No multi-tenancy complexity
- Hardcoded admin credentials in `.env`
- Simpler auth (JWT, no refresh tokens)

### **2. Data Normalization**
- Companies are entities, not strings
- Auto-deduplication prevents data fragmentation
- Relationships via foreign keys

### **3. Activity Tracking**
- Everything has a timeline
- `lastTouchAt` computed from latest activity
- Status history for auditing

### **4. Proactive Reminders**
- Follow-ups auto-created on stage changes
- Notifications for upcoming follow-ups
- KPI targets to hit daily goals

### **5. Quality Over Quantity**
- Tailoring score: how well CV matches job
- Personalization score: how customized outreach is
- Heat scoring: compute relationship momentum so the hottest jobs stay visible

---

## 📐 **System Architecture**

### **Module Relationships**

```
                    ┌─────────────┐
                    │   CONTACTS  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌──────────┐
        │ OUTREACH│  │REFERRALS│  │  REVIEWS │
        └────┬────┘  └────┬────┘  └──────────┘
             │            │
             │       ┌────┴─────┐
             └──────►│   JOBS   │
                     └──────────┘
                           │
                     ┌─────┴──────┐
                     │            │
                     ▼            ▼
              ┌──────────┐  ┌──────────┐
              │FOLLOW-UPS│  │   KPIs   │
              └──────────┘  └──────────┘
```

### **Data Flow**

1. **Create Contact** → Optionally creates Company
2. **Create Job** → Optionally creates Outreach
3. **Log Outreach** → Updates `job.lastTouchAt`, may promote `contact.strength`
4. **Change Job Stage** → Creates StatusHistory, may create Follow-Up
5. **Submit Application** → Creates JobApplication, recalculates heat
6. **Receive Referral** → Links Contact → Job, promotes contact

---

## 🚀 **Current Status** (October 2025)

### **Implemented (Production Ready)**
- ✅ Jobs Module (full CRUD, signal-based heat scoring, status history)
- ✅ Contacts Module (enhanced with email/phone/LinkedIn/GitHub/tags)
- ✅ Companies Module (auto-deduplication, search)
- ✅ Outreach tracking
- ✅ Referrals tracking
- ✅ Code Reviews
- ✅ Events
- ✅ Follow-Ups
- ✅ Notifications
- ✅ KPIs & Dashboard
- ✅ Projects (for code reviews)
- ✅ Boost Tasks (weekly improvements)

### **Recent Enhancements**
- **Contacts 1.0** (October 2025):
  - Added 8 new fields (email, phone, URLs, location, tags)
  - Company normalization
  - Timeline view (outreaches, referrals, reviews)
  - Enhanced search (multi-field)
  - ContactDrawer UI with tabs

### **Future Enhancements**
- Email integration (auto-log sent emails as outreach)
- LinkedIn API integration (auto-import connections)
- Calendar integration (sync interview dates)
- Analytics dashboard (conversion rates, response rates)
- Export/backup functionality

---

## 📚 **Original Requirements**

### **Core Workflows**

#### **1. Job Discovery → Application**
1. Find job posting online
2. Create job in system (company, role, optional source URL)
3. Tailor CV (track tailoring score 0-100)
4. Submit application via system
5. System auto-creates follow-up reminder

#### **2. Networking → Referral**
1. Add contact to system
2. Reach out via email/LinkedIn (log in Outreach)
3. Contact agrees to refer
4. Log referral (links contact → job)
5. Contact strength auto-promoted to MEDIUM/STRONG

#### **3. Interview Prep → Offer**
1. Job moves to SCREENING stage
2. System creates follow-up for thank-you note
3. Job moves to INTERVIEW
4. Heat climbs as referrals, positive outreach, and tailoring scores accumulate (recency-weighted).
5. Offer stage applies the highest baseline/cap so the badge remains very hot until archived.

#### **4. Code Review Request**
1. Select senior contact
2. Select project to review
3. Log code review request
4. Receive feedback with quality score
5. Use feedback to improve

---

## 🎯 **Success Metrics**

### **User Goals**
- Send 5-10 CVs per week
- Make 10+ networking outreach per week
- Attend 1-2 events per month
- Get 3+ referrals per month
- Maintain 20+ MEDIUM/STRONG contacts

### **System Features to Support**
- Daily KPI dashboard (track progress)
- Follow-up reminders (never forget)
- Heat scoring (decay-weighted signals to prioritize urgent jobs)
- Network stars (identify top referrers)
- Timeline views (see complete history)

---

## 💡 **Key Insights**

### **Job Hunting is a Pipeline**
Like sales, it's a numbers game with conversion rates:
- 100 jobs found → 30 applications sent
- 30 applications → 10 responses
- 10 responses → 5 phone screens
- 5 screens → 2 interviews
- 2 interviews → 1 offer

**System Goal**: Maximize each conversion rate.

### **Networking Multiplies Results**
- Cold application: 1-2% response rate
- Referral: 5-10% response rate
- Warm intro: 15-30% response rate

**System Goal**: Track and leverage network effectively.

### **Consistency > Intensity**
- Better to send 5 CVs/week for 10 weeks than 50 in one week
- Daily follow-ups keep you top-of-mind
- Regular event attendance builds network

**System Goal**: Daily KPIs and reminders ensure consistency.

---

## 📝 **Decision Log**

### **Why Single-User?**
**Decision**: Build for one user (yourself) instead of multi-tenant SaaS.
**Rationale**:
- Simpler auth (no password reset, no email verification)
- No row-level security complexity
- Faster development
- Can always add multi-tenancy later

### **Why NestJS?**
**Decision**: Use NestJS instead of Express/Fastify.
**Rationale**:
- Built-in dependency injection
- Modular architecture (scales well)
- TypeScript-first
- Good Prisma integration

### **Why Radix UI?**
**Decision**: Use Radix primitives instead of Material-UI/Chakra.
**Rationale**:
- Unstyled (full control with Tailwind)
- Accessible by default
- Smaller bundle size
- Modern patterns (slots, compound components)

### **Why Heat Scoring?**
**Decision**: Add a signal-driven heat score (0–100) mapped to a 0–3 badge instead of simple priority flags.
**Rationale**:
- More granular than High/Medium/Low
- Auto-calculated from stage baselines, referrals, outreach signals, personalization, tailoring, and recency decay
- Visual urgency (color-coded)
- Gamifies the process (watch heat rise)

---

**Document Created**: October 30, 2025
**Last Updated**: November 1, 2025
**Version**: 1.0
