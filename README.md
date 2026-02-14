# Aura: The Student Mental Health Guardian

A modern, responsive website for student mental health journaling with AI-powered mood analysis.

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js & npm

### Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic google-generativeai python-dotenv
   ```
4. Create a `.env` file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_key_here
   ```
5. Run the backend:
   ```bash
   python main.py
   ```

### Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the frontend:
   ```bash
   npm run dev
   ```

## Privacy & Disclaimer
- Aura stores your data locally/securely in an SQLite database.
- You can delete all your data at any time from the Settings page.
- **Disclaimer:** Aura is not a substitute for professional medical advice. If you are in immediate danger, please contact emergency services.
