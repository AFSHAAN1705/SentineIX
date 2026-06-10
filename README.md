# SentinelX Cyber Security Platform

![Dashboard](screenshots/dashboard.png)

AI-powered Cyber Security Incident Response & Threat Intelligence Platform

Welcome to **SentinelX**, a full-stack Cyber Security Operations Center (SOC) platform I built to help manage, investigate, and resolve security incidents. It streamlines the whole incident response workflow using role-based access, real-time dashboards, and an integrated AI Analyst to automate the heavy lifting.

---

## 🌟 Key Features

### 1. 🔐 Role-Based Access Control (RBAC)

* **Admin**: Has full control over platform settings, user management, audit logs, and global analytics.
* **Analyst**: The main workspace for SOC Analysts. They can investigate assigned incidents, log their findings, and mark threats as resolved.
* **Reporter**: A standard user account that allows employees to report security incidents and track their status.

---

### 2. 🚨 Incident Management

* **Detailed Reporting**: Users can report incidents and assign severity levels, incident types, and list affected systems.
* **Assignment System**: Admins can quickly assign open incidents to available analysts.
* **Investigation & Resolution**: Analysts have a dedicated space to add investigation notes, gather evidence, update the status, and write a final mitigation summary once the threat is handled.

---

### 3. 🤖 AI Chatbot & Analyst Integration

* **Interactive Chatbot**: You can ask the AI natural language questions like *"What are the critical incidents?"* or *"Give me a dashboard overview"*, and it will fetch real-time stats directly from the database.
* **Incident Analysis**: Tell the bot to *"analyse [Incident Name]"* and it will scan the database, summarize the incident, and recommend the standard SOC response playbook.
* **Automated AI Response**: If an admin assigns an incident directly to the "AI Analyst", the system automatically takes over. The AI investigates, logs its notes, mitigates the threat, and resolves the incident instantly.

---

### 4. 📊 Dashboards & Analytics

* Visualized data using interactive charts to show incident trends, severity breakdowns, and threat types over time.
* Ability to generate and download PDF reports and CSV exports of the current security landscape.

---

### 5. 🛡️ Threat Intelligence & Audit Logs

* Includes a live feed of known threats, malware campaigns, and vulnerabilities.
* Comprehensive Audit Logging tracks every status change, assignment, and profile update to ensure strict compliance.

---

## 🛠️ Technology Stack

I built this project using a modern, decoupled architecture:

### Frontend

* **React.js & Vite**: For a fast and responsive user interface.
* **React Router**: For handling client-side routing.
* **Chart.js**: To power the interactive data visualizations on the dashboard.
* **Custom CSS / Glassmorphism**: For a sleek, modern, dark-mode aesthetic.

### Backend

* **Node.js & Express.js**: For the REST API backend.
* **PostgreSQL**: As the main relational database.
* **Sequelize ORM**: For managing database schemas and queries in JavaScript.
* **JWT & bcryptjs**: For secure user authentication and password hashing.

---

## 🚀 How to Run the Project Locally

### Prerequisites

Make sure you have **Node.js** and **PostgreSQL** installed on your computer.

---

### 1. Database Setup

1. Open PostgreSQL (via pgAdmin or your terminal).
2. Create a new database named `sentinelx_db`.

---

### 2. Backend Setup

1. Open a terminal and navigate to the backend folder:

```bash
cd backend
```

2. Install all the necessary packages:

```bash
npm install
```

3. Create a `.env` file in the `backend` directory and add the following variables:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sentinelx_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=your_super_secret_jwt_key
```

*(Make sure to replace `DB_PASSWORD` with your actual Postgres password)*

4. Start the server:

```bash
npm run dev
```

*(Note: When the server starts for the first time, it will automatically connect to Postgres, sync the tables, and populate the database with realistic demo data so you don't start with an empty application!)*

---

### 3. Frontend Setup

1. Open a second terminal window and go to the frontend folder:

```bash
cd frontend
```

2. Install the frontend dependencies:

```bash
npm install
```

3. Start the Vite development server:

```bash
npm run dev
```

4. Finally, open your browser and go to:

```text
http://localhost:5173
```

---

## 🔑 Demo Login Credentials

Since the database seeds itself automatically, you can use these default accounts to explore the different roles.

### Admin Account

* **Email:** `admin@sentinelx.io`
* **Password:** `Demo@1234`

---

### Analyst Account

* **Email:** `analyst1@sentinelx.io`
* **Password:** `Demo@1234`

---

### Reporter Account

* **Email:** `reporter1@company.com`
* **Password:** `Demo@1234`

---

## 📸 Screenshots

### Dashboard

![Dashboard](screenshots/dashboard.png)

---

### Analytics Page

![Analytics](screenshots/analytics-page.png)

---

### Incidents Page

![Incidents](screenshots/incidents-page.png)

---

### Login Page

![Login](screenshots/login-page.png)

---

### Report Page

![Report](screenshots/report-page.png)

---

### Reporting Page

![Reporting](screenshots/reporting-page.png)

---

### Security Analyse Page

![Security Analyse](screenshots/security-analyse-page.png)

---

### Threat Intelligence

![Threat Intelligence](screenshots/threat-intelligence.png)
