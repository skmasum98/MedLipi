This is a natural and necessary evolution. We are evolving MedLipi from a **Personal Tool** (Doctor-only) to a **Clinic Management System (CMS)** (Team-based).

### "Thinking Like a Doctor": What is missing?
If I am a busy doctor running a clinic with staff, here is what breaks the current system:

1.  **Security Risk:** I cannot give my Username/Password to my assistant just to manage the queue. They might see sensitive patient secrets or delete my settings.
2.  **The "Pre-Check" Bottleneck:** When a patient enters my room, I waste 3 minutes asking "Weight? BP? Pulse?". My assistant should have entered this *before* the patient walks in.
3.  **Triage/Queue:** I need my Receptionist to filter patients. "Who paid? Who is here for just a report show? Who is a new patient?"
4.  **Admin Control (SAAS View):** If I am the software owner (Admin), I need to ban doctors who use the software illegally or span the system.

---

### The Grand Plan: MedLipi Clinic Ecosystem

We will restructure the app into **4 Specific Roles**, each with a distinct interface.

#### 1. 👮 Super Admin (The Platform Owner)
*   **Purpose:** Control the software integrity.
*   **Capabilities:**
    *   **Doctor Directory:** List all doctors.
    *   **Action:** **Suspend** (Stop login), **Delete** (Remove data), **Reset Password**.
    *   **Global Analytics:** Total Prescriptions, Total Patients (System-wide).
    *   **Database Hygiene:** Clean up orphan records.

#### 2. 👩‍⚕️ Doctor (The Boss/Admin of Clinic)
*   **Purpose:** Treat patients + Manage Staff.
*   **Current Capabilities:** (Keep existing) Prescribe, History, Inventory, Schedule.
*   **New Capabilities:**
    *   **Staff Management:** Create accounts for Receptionist/Assistant.
    *   **Permissions:** Assign what staff can see.

#### 3. 👩‍💼 Receptionist (The Front Desk)
*   **Purpose:** Scheduling & Flow Management.
*   **UI Focus:** A heavy-duty "Queue Board" (Kanban style).
*   **Capabilities:**
    *   **Register Patient:** Create new patient (Entry point).
    *   **Book Serial:** Select slot for doctor.
    *   **Check-In:** Mark status "Waiting in Lobby".
    *   **Payments (Optional):** "Payment Collected" checkbox.
    *   **Restrictions:** ❌ CANNOT see Diagnosis, Advice, or Prescriptions (Privacy).

#### 4. 👨‍⚕️ Assistant / Medical Officer (The Helper)
*   **Purpose:** Clinical Prep.
*   **UI Focus:** "Vitals Station" & "Queue List".
*   **Capabilities:**
    *   **View Queue:** Call patient in.
    *   **Vitals Entry:** Take **BP, Weight, Pulse, Temp, SpO2, Chief Complaint (Brief)**.
    *   **Pre-History:** Ask allergies or past history.
    *   **Restrictions:** ✅ CAN Write Vitals/CC. ❌ CANNOT Write Medicine/Advice (Read-only or Hidden).

---

### 🗺️ The New Patient Flow

1.  **Reception:** Patient arrives. Receptionist finds them in Directory or Registers them. Assigns **Serial #5**. Marks Status: **"Waiting"**.
2.  **Assistant:** Sees "Serial #5 Waiting". Calls them. Enters **BP: 120/80, Wt: 70kg**. Updates Status: **"Ready for Doctor"**.
3.  **Doctor:** Opens Dashboard. Sees "Serial #5 Ready". Clicks "Start".
    *   *Magic Moment:* The form opens, and **BP, Weight, and Name are ALREADY FILLED**.
    *   Doctor focuses purely on Diagnosis and Medicine.
4.  **Doctor:** Prints & Closes. Status: **"Completed"**.

---

### 🛠️ Technical Implementation Roadmap

We will tackle this in **3 Phases**.

#### Phase 2.1: The Super Admin & Database Refactor
We need to introduce a generic **`users`** or **`staff`** table and upgrade the Auth system to handle roles.

*   **DB:** Create `clinic_staff` table (username, password, role, linked_doctor_id).
*   **DB:** Create `admins` table.
*   **Backend:** Upgrade `auth.js` middleware to handle `req.user.role` ('doctor', 'admin', 'reception', 'assistant').

#### Phase 2.2: Staff Management UI
*   **Page:** Doctor needs a page `Settings -> My Staff` to Add/Edit/Delete their staff.
*   **Page:** Super Admin Dashboard to manage Doctors.

#### Phase 2.3: Role-Specific Dashboards
*   **Reception View:** A specific dashboard focused only on Calendar/Queue.
*   **Assistant View:** A "Triage" form (Just Vitals inputs).
*   **Permission Checks:** Frontend Router must block a Receptionist from visiting `/prescription/new`.

---

### ❓ Question for you

Does this flow align with what you visualized?

If you agree, I suggest we start with **Phase 2.1 (Database & Auth)** immediately. We need to create the table structure for the Admin and Staff before we build their pages.

**Shall I give you the SQL schema changes?**