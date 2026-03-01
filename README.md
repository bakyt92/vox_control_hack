Project: Vox Control
This project is a voice-controlled AI agent application built using the LiveKit Agents framework. It combines a real-time voice interaction pipeline with a web-based frontend and a persistent backend API.

🏗 Architecture
The system consists of three main components:
**1. Voice Agent (agent.py)**
A Python-based agent that handles real-time voice conversations.
Pipeline: STT (Speech-to-Text) $\rightarrow$ LLM (Language Model) $\rightarrow$ TTS (Text-to-Speech).

Models:
STT: Speechmatics
LLM: OpenAI GPT-4.1-mini
TTS: Cartesia Sonic
VAD: Silero (Voice Activity Detection)
Features:
Custom conversation tasks (e.g., ExpectOptionsTask, AcknowledgeInfoTask) to ensure structured data collection and user understanding.
Event emission to the frontend (e.g., option_collected).
Noise cancellation optimized for different inputs (e.g., SIP/Telephony).

**2. Backend API (backend/)**
A FastAPI application that serves as the control plane.
Database: MongoDB (for storing agent configurations and data).
Endpoints:
/agents: CRUD operations for agent data.
/livekit/token: Generates access tokens for the frontend to connect to LiveKit rooms.
Deployment: Dockerized with docker-compose.

**3. Frontend (frontend/)**
A modern web interface built with Vite, React, and Tailwind CSS.
Connects to LiveKit rooms to facilitate user interaction with the voice agent.
likely visualizes agent state and events.

**🛠 Tech Stack**
Languages: Python 3.10+, TypeScript
Frameworks: LiveKit Agents, FastAPI, React, Vite
AI/ML: OpenAI, Speechmatics, Cartesia, Silero
Database: MongoDB
Infrastructure: Docker, Docker Compose
**🚀 Getting Started (Summary)**
Backend: Run via docker compose up or locally with uvicorn.
Agent: Run python agent.py dev to connect to LiveKit.
Frontend: Standard Vite setup (npm install && npm run dev).
