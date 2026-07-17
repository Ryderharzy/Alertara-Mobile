# 🚨 Capstone Project: Emergency Communication System (ECS)

## 📌 Overview

The **Emergency Communication System (ECS)** is a capstone project designed to provide a **reliable, fast, and multi-channel communication platform** during emergencies. It focuses on delivering critical alerts to the public and enabling **two-way communication** between authorities and citizens.

The system addresses real-world problems such as delayed emergency notifications, lack of communication coordination, and limited accessibility of alerts during disasters like:

- Typhoons 🌧️
- Earthquakes 🌍
- Fires 🔥
- Bomb Threats 💣

The primary goal of ECS is to **enhance public safety** by ensuring:

- Timely dissemination of alerts
- Accurate categorization of emergencies
- Accessibility for diverse users
- Real-time feedback from citizens

---

## 🧱 Architecture and Deployment

- The ECS is organized as two main workspaces:
  - `C:\Users\Sis\Mobile App Development\Centralized App\Alertara-Mobilev` for the React Native mobile app and user-facing screens.
  - `C:\Users\Sis\Mobile App Development\Centralized App\alertara-mobile-api` for the server API, database access, and admin-oriented services.
- Each workspace has its own purpose: the front end handles citizen interaction and alert display, while the back end handles data, authentication, alerts, and logging.
- We are using Hostinger for the deployed database host.
- Locally, development is currently using an exported version of that deployed database on XAMPP.
- The intended testing setup is to switch from the local exported DB to the actual deployed DB for more realistic end-to-end testing.

---

## 🛠️ Tech Stack

- Frontend: React Native `0.81.5` with Expo `54`, Expo Router, and TypeScript.
- Frontend state and architecture: Redux Toolkit, React Navigation bottom tabs, hooks-based theming, and `expo-router` page routing.
- Frontend UI & device features: `react-native-svg`, `expo-image`, `expo-location`, `react-native-maps`, `react-native-webview`, and `react-native-safe-area-context`.
- Networking: `axios` for API calls and `jwt-decode` for token handling.
- Backend: Laravel `13.8` on PHP `^8.3`.
- Backend tools: `laravel/tinker`, `phpunit`, `laravel/pint`, and Composer for dependency management.
- Database: MySQL, with deployed DB hosted on Hostinger and local dev using an exported XAMPP copy.
- Deployment / version control: GitHub for backend repo, `.env.example` template for env configuration, and Hostinger for the live DB host.

---

## ⚙️ How the System Works

The ECS operates through a structured workflow:

1. **Emergency Detection / Input**
   - Authorities or system admins identify and input an emergency event.

2. **Alert Categorization**
   - The system classifies the alert (e.g., Weather, Fire, Earthquake).

3. **Message Generation**
   - A standardized alert message is created based on the category.

4. **Multi-Channel Distribution**
   - Alerts are sent via:
     - SMS
     - Email
     - Public Address (PA) Systems

5. **User Notification**
   - Citizens receive alerts based on their preferences.

6. **Two-Way Communication**
   - Users can:
     - Acknowledge alerts
     - Report their status
     - Send real-time information

7. **Logging and Monitoring**
   - All activities are recorded for auditing and improvement.

---

## 🧩 System Modules

### 📢 1. Mass Notification System

- Sends alerts through multiple communication channels
- Ensures redundancy and maximum reach
- Minimizes risk of message delivery failure

---

### 🏷️ 2. Alert Categorization Module

- Classifies emergencies into predefined categories:
  - Weather
  - Earthquake
  - Fire
  - Bomb Threat
- Standardizes alert format and response procedures

---

### 🔄 3. Two-Way Communication Interface

- Enables interaction between users and authorities
- Users can:
  - Confirm receipt of alerts
  - Report conditions (safe, injured, trapped, etc.)
- Helps authorities make better decisions in real-time

---

### 🌐 4. Multilingual Support Module

- Provides alerts in multiple languages
- Ensures inclusivity and accessibility
- Important for diverse communities

---

### 👤 5. Citizen Subscription and Preferences Module

- Users can:
  - Subscribe to specific alert types
  - Choose preferred notification channels (SMS, Email)
- Personalizes user experience

---

### 📜 6. Log and Audit Trail Module

- Records:
  - Sent alerts
  - Timestamps
  - Recipients
  - Delivery status
- Supports:
  - Accountability
  - System evaluation
  - Debugging and improvements

---

## 🚀 Areas for Improvement

To further enhance the ECS, the following improvements can be implemented:

### 🔧 Technical Improvements

- Real-time GPS tracking integration
- Mobile app version (Android/iOS)
- Offline alert capability (via SMS fallback)
- AI-based emergency prediction and prioritization

### 📊 System Enhancements

- Dashboard analytics for authorities
- Heatmaps for affected areas
- Automated alert escalation system

### 🔐 Security Improvements

- Data encryption for user information
- Secure authentication (2FA)
- Protection against spam or false alerts

### 🌍 User Experience Improvements

- Better UI/UX design
- Voice alerts for visually impaired users
- Integration with maps (live location display)

---

## 🎯 Project Focus

This capstone project primarily focuses on:

- Building a **robust Emergency Communication System (ECS)**
- Developing **modular architecture** for scalability
- Ensuring **reliability and speed** in emergency situations
- Implementing **real-time two-way communication**
- Enhancing **public safety and awareness**

---

## 🏁 Conclusion

The **Emergency Communication System (ECS)** aims to bridge the communication gap during crises by providing a **fast, reliable, and intelligent alert system**. Through its modular design and multi-channel capabilities, it ensures that critical information reaches the right people at the right time—ultimately saving lives and improving emergency response efficiency.

---

## Progress Log (updated Mar 25, 2026)

- Renamed admin route folder to `emergency-communication/` for clarity and future staff tools (was `ecs/`).
- Focus: implementing **Two-Way Communication** first; mass notification and alert categorization remain admin-only for now.
- Citizen chatbot:
  - Per-alert "Chatbot" button opens `/chat/[alertId]`; floating General Inquiry button on home and notifications.
  - Prompt chips now vary by category (Alert, Weather, Fire, General).
  - Conversations persist locally via AsyncStorage (per thread, capped history).
- Incident reporting:
  - Report submit hands off directly to chat with generated incident id; shows send spinner and confirmation.
  - Last incident chat saved locally with "Resume last incident chat" chip and "Open chat" banner.
  - Added local incident history index (max 20) with status (Pending), category icon, timestamp, and "Open conversation" button; accessible via "View report history" on the Report hero card.
- UI polish:
  - Floating chatbot button added to Notifications.
  - Mis-encoded separators fixed.

Next steps:

1. Offline/poor-network handling for report submission (queue + retry banner).
2. Status progression for incident threads (Pending -> Received -> In progress -> Resolved) with color pills.
3. (Optional) Staff-side mirrored thread under central command when ready.
4. Media attach flow for reports (picker + thumbnail + upload guard).
