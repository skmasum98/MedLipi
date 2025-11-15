# MedLipi: Open-Source Prescription & Patient Instruction Generator

## MedLipi: Sequential Work Table & Checklist

| Serial | Phase | Module/Feature | Task Description | Priority | Owner (Focus) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Setup** | Project Setup | Initialize Git Repository, set up basic React and Node/Express projects. | P1 | Full Stack |
| **02** | **Setup** | Database | Setup MySQL instance, establish connection between Node.js API and MySQL. | P1 | Back-end |
| **03** | **Setup** | Database Schema | Design and implement core MVP tables: `doctors`, `patients`, `drug_inventory`, `prescriptions`. | P1 | Back-end |
| **04** | **Setup** | Authentication | Develop user registration, login, and simple token-based authentication (JWT). | P1 | Full Stack |
| **05** | **MVP** | Doctor Profile | **Frontend:** Build the static Doctor Profile view to display credentials (loaded after login). | P1 | Front-end |
| **06** | **MVP** | Drug Data API | **Backend:** Implement API endpoints (CRUD) for the `drug_inventory` table. | P1 | Back-end |
| **07** | **MVP** | Drug Data Import | Develop a utility/UI to import the initial local drug list (CSV import into MySQL). | P1 | Full Stack |
| **08** | **MVP** | Prescription Form | **Frontend:** Build the main Prescription Generation Form (Drug Search, Manual SIG/Dose, Quantity). | P1 | Front-end |
| **09** | **MVP** | Prescription API | **Backend:** Develop API to handle saving a new prescription record to the `prescriptions` table. | P1 | Back-end |
| **10** | **MVP** | Patient Guide | **Frontend:** Add text fields for manually entering **Diagnosis Text** and **General Advice** for the handout. | P1 | Front-end |
| **11** | **MVP** | **Output Engine** | Implement PDF generation service (e.g., using `pdfkit` or `puppeteer`) on the Node.js API. | P1 | Back-end |
| **12** | **MVP** | **Output Templates** | Design and code the two final print templates: **1. Legal Prescription Slip** and **2. Patient Instruction Guide**. | P1 | Full Stack |
| **13** | **MVP** | Testing/Release | Final testing of the end-to-end MVP workflow. Deploy to a test environment. | P1 | Full Stack |
| **---** | **---** | **---** | **END OF MVP PHASE** | **---** | **---** |
| **14** | **V1.0** | Database Schema | Add V1.0 tables: `sig_templates`, `instruction_blocks`. | P2 | Back-end |
| **15** | **V1.0** | Patient History | Implement patient record creation and association of prescriptions to the patient ID. | P2 | Full Stack |
| **16** | **V1.0** | SIG Templates | **Backend/Frontend:** Develop CRUD for saving/loading custom **SIG Templates** (e.g., dosage instructions). | P2 | Full Stack |
| **17** | **V1.0** | Instruction Modules | **Backend/Frontend:** Develop CRUD for pre-written **Modular Instruction Blocks** (e.g., "Hypertension Diet"). | P2 | Full Stack |
| **18** | **V1.0** | Prescription Form | Integrate dropdowns for saved SIG Templates to auto-fill the instruction field. | P2 | Front-end |
| **19** | **V1.0** | Patient Guide | Update the Guide UI to allow selection/insertion of the new Modular Instruction Blocks. | P2 | Front-end |
| **20** | **V1.0** | Dashboard | Implement a basic dashboard with recent patients and prescription search functionality. | P2 | Front-end |
| **---** | **---** | **---** | **END OF V1.0 PHASE** | **---** | **---** |
| **21** | **Full** | Database Schema | Add schema for community review/submission tables (`submissions`, `reviews`). | P3 | Back-end |
| **22** | **Full** | Contribution UI | Develop the interface for doctors to **submit** new Drug/Instruction content for review. | P3 | Front-end |
| **23** | **Full** | Review Workflow | **Backend:** Implement logic for submission/review/approval of community content before merging to live data. | P3 | Back-end |
| **24** | **Full** | Trade Name Search | Implement robust search logic allowing doctors to search by **Trade Name** and get the Generic match. | P3 | Back-end |
| **25** | **Full** | Refill Feature | Add "Refill" button to past prescriptions to generate a new, identical prescription in one click. | P3 | Full Stack |
| **26** | **Full** | ICD-10 Link | Implement a small `diagnosis_codes` table and allow linking a diagnosis to the prescription. | P3 | Full Stack |
| **27** | **Full** | Documentation | Prepare comprehensive technical documentation and user guides for the open-source community. | P3 | Full Stack |