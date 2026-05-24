
# AI TRAVELLER [GEO-GUIDE AGENT]

![image](https://github.com/user-attachments/assets/44509f2b-d93e-4c12-ae0f-9e0f809bb53d)

<img width="1532" height="932" alt="image" src="https://github.com/user-attachments/assets/8086960a-cb7f-4246-9c91-6c41f48da972" />

<img width="789" height="870" alt="image" src="https://github.com/user-attachments/assets/97d7073d-5405-4054-a9e7-bb2cb64e04cd" />



<img width="749" height="864" alt="image" src="https://github.com/user-attachments/assets/87de3295-1f8b-43d0-b8da-0b799ee2e818" />

<img width="742" height="846" alt="image" src="https://github.com/user-attachments/assets/356b6ac5-9c35-40bf-9635-bbbdf0ac4508" />

<img width="902" height="446" alt="image" src="https://github.com/user-attachments/assets/0b813d60-b5e1-432f-8a87-068b5976f661" />


![Screenshot 2025-03-02 092335](https://github.com/user-attachments/assets/792f4f00-d951-4c9f-819e-f2669e95200a)
![GitHub license](https://img.shields.io/github/license/abhijit826/saksh)
![GitHub issues](https://img.shields.io/github/issues/abhijit826/saksh)
![GitHub last commit](https://img.shields.io/github/last-commit/abhijit826/saksh)
<img width="1917" height="957" alt="image" src="https://github.com/user-attachments/assets/a088bd5d-5cc9-4ecc-88de-d0faeacf1d83" />
<img width="1343" height="825" alt="Screenshot 2026-05-22 131436" src="https://github.com/user-attachments/assets/20e0f783-2547-4345-b7c0-02d94fbf03ad" />
<img width="1125" height="866" alt="Screenshot 2026-05-22 131532" src="https://github.com/user-attachments/assets/08524e74-4e6b-4132-86d0-915d2144924d" />
<img width="1535" height="963" alt="image" src="https://github.com/user-attachments/assets/90c76889-c10e-41fd-a772-5d268c4065cb" />
<img width="1468" height="959" alt="image" src="https://github.com/user-attachments/assets/802beaab-154a-40f1-8ef5-9cf357115e96" />

Welcome to the AI TARVEL Planner! This is a React-based web application designed to help users plan their trips, view itineraries, and interact with a dynamic map interface. The frontend is built with modern tools and is intended to work with a backend (currently in development) for full functionality.
## Blockchain-Secured Documents
<img width="1181" height="852" alt="image" src="https://github.com/user-attachments/assets/9e55fb2d-4e7b-4c5e-bfdf-2820d2358bba" />
<img width="1331" height="841" alt="image" src="https://github.com/user-attachments/assets/64b45033-2661-4a08-86ca-fb985fb552f6" />
<img width="996" height="850" alt="image" src="https://github.com/user-attachments/assets/336d4bb1-bca1-42b6-aeae-8dc927cf17f0" />


![Screenshot 2025-03-02 092627](https://github.com/user-attachments/assets/a1225b09-c0e9-40ab-9684-dba08611b501)


###  Your documents are encrypted and secured using blockchain technology.




## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Backend Integration](#backend-integration)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- Blockchain-Secured Documents

## Features
- User authentication (register/login) interface.
- Trip creation and detailed view with map integration using Google Maps API.
- Itinerary display with weather and activity details.
- Responsive design with animations using Framer Motion.
- Navigation between trip creation, details, and profile pages.
-  **AI Budget Optimizer**: Live expense logger, category breakdown graphs, savings recommendations, spending pace tracking, and automatic multi-currency conversion.
- **AI Packing Assistant**: Fully personalized packing checklists generated based on destination, expected weather, planned activities, transit modes, and airline baggage limits.
- **AI Travel Eligibility & Readiness Engine**: Cross-references stored documents (Passports, Visas, Insurance, Vaccines) with upcoming trip criteria to calculate Travel Readiness and Immigration Confidence Scores.
- **AI OCR Document Scanner**: Autofills document creation and edit forms on upload using Bedrock document intelligence.
- **AI Travel Risk Radar**: Real-time geopolitical unrest checks, weather/seismic alerts, health outbreak bulletins, custom scam risk meters, emergency hotlines, and local caution zones.
- **AI Travel Concierge (Aria)**: A 24/7 intelligent travel assistant providing contextualized support (dining, transit, accommodations, sights) tailored directly to your selected trip destinations, companions, budget, and activities.

## Technologies
- **Frontend**:
  - React
  - Vite
  - TypeScript
  - Tailwind CSS
  - Framer Motion (for animations)
  - React Router
  - Axios
- **Dependencies**: Managed via `package.json` (e.g., `@react-google-maps/api`, `lucide-react`).

## Installation

### Prerequisites
- Node.js (v14.x or later)
- npm or yarn
- Google Maps API Key
- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# TravelAI Project Architecture & Interview Guide

This document provides a comprehensive overview of the TravelAI system architecture, data flows, and key technical concepts designed to prepare you for technical interviews.

---

## 1. System Architecture

The following diagram illustrates the end-to-end architecture of the TravelAI application:

<img width="1017" height="906" alt="image" src="https://github.com/user-attachments/assets/de066e31-c26e-41b7-8d30-ef5409b39014" />


## 2. Component Breakdown

### A. Frontend Tier
- **Stack**: React, Vite, TypeScript, Tailwind CSS, Framer Motion.
- **Hosting**: Deployed on **Amazon S3** configured for static web hosting. 
- **Delivery**: Fronted by **Amazon CloudFront** (CDN) with HTTPS enforcement.
- **Why CloudFront?** Decreases global latency through caching edge locations, secures traffic with SSL certificates, and handles SPA (Single Page Application) routing redirects (redirecting 403/404 errors to `index.html`).

### B. Backend API Tier (EC2)
- **Stack**: Node.js, Express.js.
- **Process Manager**: Managed via **PM2** running in fork mode under the `ec2-user` workspace directory. 
- **Routing**: Mounted behind an **API Gateway HTTP API** proxy. API Gateway handles CORS preflights and forwards `/api/{proxy+}` calls down to the load balancer/EC2 instance on port 5000.

### C. Serverless Computation Tier (AWS Lambda)
- **Feature**: Dynamic Itinerary Generation.
- **Why Lambda?** Generative itinerary calculations can consume high CPU and memory resources. Moving this compute-heavy, synchronous invocation off the EC2 instance to AWS Lambda prevents CPU starvation on our core API server.

### D. Data Tier (Amazon DynamoDB)
- **Tables**:
  1. `travelplanner-users`: PK (`userId` / `email`).
  2. `travelplanner-trips`: PK (`userId`), SK (`_id`).
  3. `travelplanner-documents`: PK (`userId`), SK (`_id`).
- **Access Patterns**: Optimally uses partition keys (`userId`) to group trips and documents per user, minimizing read/write capacity units (RCU/WCU).

### E. AI Orchestration Tier (Amazon Bedrock)
- **Client**: AWS SDK for JS `@aws-sdk/client-bedrock-runtime`.
- **Model**: `apac.amazon.nova-pro-v1:0` (Amazon Nova Pro inference profile in Mumbai region `ap-south-1`).
- **Security**: The EC2 instance profile contains IAM execution policies allowing `bedrock:InvokeModel`. No raw access tokens are exposed.

---

## 3. Deep Dive: Core AI Features

### 1. AI Budget Optimizer
- **Concept**: Analyzes logged expenses against a trip's limits, alerts the user to overspending, and converts foreign currencies.
- **How it works**:
  1. The app aggregates all logged expenses in the client's base currency.
  2. The details are compiled into a string and sent to Bedrock Nova Pro.
  3. The model returns a structured JSON string detailing predicted totals, category breakdowns, savings recommendations, and warning alerts.
  4. The result is parsed and updated directly into the trip’s `predictions` field in DynamoDB.

### 2. AI Packing Assistant
- **Concept**: Generates customized clothing, toiletries, transit, and electronic checklists based on real-time trip parameters.
- **How it works**:
  1. The frontend collects transit mode (Flight, Train, Bus, Car), weather expectations (Mild, Cold, Hot, Extreme), and baggage limits (e.g. Carry-on Only).
  2. The backend passes these preferences alongside activities (e.g., hiking, formal dinner) to the AI model.
  3. The prompt specifies transit-specific safety advice (e.g., locking bags to overhead racks on trains) and baggage limitations.
  4. The model returns structured checklist categories that are updated in the database and interactive on the frontend.

### 3. AI Travel Eligibility & Readiness Engine
- **Concept**: Analyzes user-stored documents and audit them against trip criteria to calculate compliance scores.
- **Sub-feature A: Multimodal OCR Scan**:
  - The traveler uploads a document photo.
  - The raw base64 string is parsed, format detected, and passed inside the `bytes` payload directly to Bedrock Nova Pro.
  - The model runs OCR on the image structure and outputs a parsed JSON schema (Document Number, Expiry, Country, etc.) to autofill the form.
- **Sub-feature B: Readiness Audit**:
  - Compiles user’s stored documents (passports, visas, vaccines, insurance) and upcoming trip details.
  - Masks sensitive numbers prior to LLM submission for PII compliance.
  - Bedrock validates visa entry rules for their nationality, passport validity duration (6-month rule), and insurance coverage dates.
  - Generates a **Travel Readiness Score** (0-100%) and **Immigration Confidence level** (High, Medium, Low).

### 4. AI Travel Risk Radar
- **Concept**: A live safety and security dashboard for travel planning.
- **How it works**:
  - Accepts a target destination and nationality.
  - Queries Bedrock to compile current security bulletins (Political instability, weather warnings, health issues), a Scam Index (0-100), unsafe districts list, and local emergency hotlines.
  - Renders a circular sonar radar animation during loading and populates glassmorphic threat cards.

---

## 4. Key Interview Q&As

### Q1: Why did you choose DynamoDB over MongoDB?
> **Answer**: 
> 1. **Serverless Scalability**: DynamoDB is a fully managed serverless database. It scales to handle traffic peaks automatically with zero database clustering administration.
> 2. **AWS Ecosystem Integration**: Using IAM roles, the EC2 server and Lambda functions authenticate to DynamoDB without saving hardcoded database connection credentials.
> 3. **Consistent Single-Digit Latency**: Single-table designs utilizing `userId` partition keys provide stable sub-10ms response times for active document retrievals.

### Q2: How does the application secure user passport photos and travel documents?
> **Answer**:
> 1. **Local Storage for Files**: Document photo URLs are kept in browser `localStorage` on the traveler's device. This avoids uploading massive files containing sensitive PII (Personally Identifiable Information) to centralized servers and prevents reaching the DynamoDB 400KB attribute limits.
> 2. **PII Masking**: Prior to sending document logs to Amazon Bedrock for readiness evaluation, numbers are masked (e.g., `AB*****34`) and policy details are stripped. Only metadata (e.g., expiry date, document type, country) is processed.
> 3. **IAM Authentication**: Communication between backend modules and AWS resources is fully authorized using IAM temporary role assumptions on the EC2 instance profile.

### Q3: How did you implement Document OCR without paying for a commercial OCR service?
> **Answer**:
> "I leveraged the multimodal capability of Amazon Bedrock Nova Pro. By sending the raw base64 image bytes inside the messages array payload of `InvokeModelCommand`, Nova Pro acts as both the OCR scanner and the semantic analyzer. It parses visual document hierarchies directly and extracts data into a structured JSON schema in a single API call, bypassing separate image extraction pipelines."

### Q4: How are backend crashes due to port conflicts managed in production?
> **Answer**:
> "I encountered an issue where duplicate server threads crashed on EADDRINUSE on port 5000. I resolved this by auditing active process users. The system had PM2 running concurrently under `root` and `ec2-user`. I removed the duplicate process from root's PM2 daemon, unified process owners to `ec2-user`, and configured permissions with `chown -R ec2-user:ec2-user` on the repository path to prevent write conflicts."

----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


### Setup
1. **Clone the Repository**
   ```bash
   git clone https://github.com/abhijit826/saksh.git
   cd saksh
   Backend-- npx nodemon server.js
