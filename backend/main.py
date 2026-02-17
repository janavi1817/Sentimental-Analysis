from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import google.generativeai as genai
from dotenv import load_dotenv
from database import SessionLocal, JournalEntry, User
import pydantic
import datetime
import base64
import numpy as np
import io
import random
try:
    import cv2
    from deepface import DeepFace
    import librosa
    import soundfile as sf
except ImportError:
    cv2 = None
    DeepFace = None
    librosa = None
    sf = None

load_dotenv()

# Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('models/gemini-2.0-flash')

app = FastAPI(title="Aura API")

@app.get("/api/health")
def read_root():
    return {"status": "Aura API is running", "endpoints": ["/journal/entries", "/mood/stats", "/docs"]}

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React App
# Mount the static directory
app.mount("/assets", StaticFiles(directory="../frontend/dist/assets"), name="assets")

# Catch-all route to serve index.html for client-side routing
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_react_app(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    with open("../frontend/dist/index.html", "r") as f:
        return f.read()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class MultiModalInput(pydantic.BaseModel):
    image: str
    audio: Optional[str] = None

class EntryCreate(pydantic.BaseModel):
    reflection_date: str
    overall_mood: str
    specific_emotions: List[str]
    triggers: str
    strategies: str
    intensity: int
    lessons: str
    template_name: str = "General"
    user_age: int = 18
    user_gender: str = "Female"
    user_phone: Optional[str] = None

class EntryResponse(pydantic.BaseModel):
    id: int
    reflection_date: str
    overall_mood: str
    specific_emotions: str
    content: str 
    strategies: str
    intensity: int
    lessons_learned: str
    template_name: Optional[str] = "General"
    user_age: int = 18
    user_gender: str = "Female"
    user_phone: Optional[str] = None
    created_at: datetime.datetime
    sentiment_score: float
    emotion: str
    suggestion: str
    breathing_exercise: str
    focus_music: str
    quote: str
    is_critical: bool = False
    emergency_contacts: List[dict] = []
    counselor_info: str = ""
    counselor_tips: str = "[]" # Stored as JSON string

    model_config = pydantic.ConfigDict(from_attributes=True)

MOOD_QUOTES = {
    "happy": [
        {"quote": "Happiness is the meaning and the purpose of life, the whole aim and end of human existence.", "author": "Aristotle", "desc": "Embrace this as your north star—channel your happiness into bold pursuits that define a legendary life, achieving greatness one joyful step at a time."},
        {"quote": "The secret of happiness is not in doing what one likes, but in liking what one does.", "author": "James M. Barrie", "desc": "Flip the script on your world: cultivate love for your path today, unlocking unstoppable momentum and turning every task into fuel for triumph."},
        {"quote": "Thousands of candles can be lit from a single candle, and the life of the candle will not be shortened. Happiness never decreases by being shared.", "author": "Buddha", "desc": "Ignite others with your light—your amplified joy becomes a ripple of influence, powering collective wins and endless personal growth."},
        {"quote": "Do what you love, and you will never work a day in your life.", "author": "Confucius", "desc": "Align now with your passions: this fusion erases drudgery, launching you into a high-octane life of pure, relentless achievement."}
    ],
    "sad": [
        {"quote": "The wound is the place where the Light enters you.", "author": "Rumi", "desc": "Seize your scars as entry points—transform pain into your greatest power source, emerging unbreakable and radiant."},
        {"quote": "This too shall pass.", "author": "Persian proverb", "desc": "Hold this truth tight: endure the storm to claim the sunshine—your resilience forges a stronger, unstoppable you."},
        {"quote": "Rocks in my path? I keep them all. With them I shall build my castle.", "author": "Nemo", "desc": "Collect every hurdle—stack them high into your empire, proving obstacles are just raw materials for your victory."},
        {"quote": "Although the world is full of suffering, it is full also of the overcoming of it.", "author": "Helen Keller", "desc": "Join the overcomers: every trial equips you to conquer bigger battles, building a legacy of fierce triumph."}
    ],
    "neutral": [
        {"quote": "Stay calm and carry on.", "author": "British wartime slogan", "desc": "Channel poise into power—press through steadily, turning calm into the foundation of your enduring success."},
        {"quote": "In the middle of difficulty lies opportunity.", "author": "Albert Einstein", "desc": "Dive into the challenge: unearth gold from gray areas, propelling yourself to genius-level breakthroughs."},
        {"quote": "The best way out is always through.", "author": "Robert Frost", "desc": "Commit to the march forward—each step sharpens your edge, leading to mastery on the other side."}
    ],
    "stress": [
        {"quote": "You are braver than you believe, stronger than you seem, and smarter than you think.", "author": "A.A. Milne", "desc": "Tap your hidden arsenal—unleash this inner force to smash stress and dominate your goals fearlessly."},
        {"quote": "Breathe. Let go. And remind yourself that this very moment is the only one you know you have for sure.", "author": "Oprah Winfrey", "desc": "Reset and reclaim control: this breath launches you into focused action, conquering chaos with clarity."},
        {"quote": "Grant me the serenity to accept the things I cannot change, courage to change the things I can, and wisdom to know the difference.", "author": "Reinhold Niebuhr", "desc": "Master the divide: wield courage strategically, transforming stress into targeted wins."}
    ],
    "frustrated": [
        {"quote": "It does not matter how slowly you go as long as you do not stop.", "author": "Confucius", "desc": "Pace yourself relentlessly—steady grind outlasts speed, building your path to inevitable victory."},
        {"quote": "Fall seven times, stand up eight.", "author": "Japanese proverb", "desc": "Rise every time: this rhythm forges iron will, turning falls into fuel for your ultimate ascent."},
        {"quote": "The brick walls are not there to keep us out. The brick walls are there to give us the chance to show how badly we want something.", "author": "Randy Pausch", "desc": "Prove your fire: scale these walls to seize what's yours, emerging a proven champion."}
    ],
    "calm": [
        {"quote": "Almost everything will work again if you unplug it for a few minutes, including you.", "author": "Anne Lamott", "desc": "Recharge deliberately: this quick reset supercharges your calm into peak performance mode."},
        {"quote": "Within you, there is a stillness and a sanctuary to which you can retreat at any time and be yourself.", "author": "Hermann Hesse", "desc": "Access your core fortress: from this calm base, launch authentic, world-changing actions."},
        {"quote": "Surrender to what is. Let go of what was. Have faith in what will be.", "author": "Sonia Ricotti", "desc": "Flow with power: release the past to accelerate toward your bold, faithful future."}
    ]
}

@app.post("/analyze-multi-modal")
async def analyze_multi_modal(data: MultiModalInput):
    try:
        # 1. Visual Analysis (OpenCV + DeepFace)
        header, encoded = data.image.split(",", 1) if "," in data.image else (None, data.image)
        img_data = base64.b64decode(encoded)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        visual_mood = "neutral"
        objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        if objs:
            raw_mood = objs[0]['dominant_emotion'].lower()
            mapping = {
                "happy": "happy", "sad": "sad", "neutral": "neutral",
                "angry": "frustrated", "fear": "stress", "surprise": "happy", "disgust": "frustrated"
            }
            visual_mood = mapping.get(raw_mood, "neutral")

        # 2. Audio Analysis (Librosa)
        audio_mood = "neutral"
        if data.audio and librosa:
            try:
                audio_data = base64.b64decode(data.audio)
                audio_io = io.BytesIO(audio_data)
                y, sr = librosa.load(audio_io, sr=None)
                
                # Simple heuristic analysis
                rms = librosa.feature.rms(y=y)[0]
                pitch = librosa.yin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
                mean_rms = np.mean(rms)
                mean_pitch = np.mean(pitch)

                if mean_rms > 0.05: # High energy
                    audio_mood = "excited" if visual_mood == "happy" else "stressed"
                elif mean_rms < 0.01: # Low energy
                    audio_mood = "calm" if visual_mood != "sad" else "melancholy"
                else:
                    audio_mood = "neutral"
            except Exception as ae:
                print(f"Audio Analysis Error: {ae}")

        # 3. Synergy Logic
        final_mood = visual_mood
        if audio_mood in ["stressed", "melancholy"] and visual_mood == "neutral":
            final_mood = "stress" if audio_mood == "stressed" else "sad"
        
        quote_data = random.choice(MOOD_QUOTES.get(final_mood, MOOD_QUOTES["neutral"]))
        
        return {
            "mood": final_mood,
            "visual_mood": visual_mood,
            "audio_mood": audio_mood,
            "quote": f"\"{quote_data['quote']}\" — {quote_data['author']}",
            "desc": quote_data['desc']
        }
    except Exception as e:
        print(f"Multi-modal Error: {e}")
        return {"mood": "neutral", "quote": "I'm here for you.", "desc": "Technical glitch, but your peace remains."}

@app.post("/analyze-visual")
async def analyze_visual(data: dict):
    if DeepFace is None or cv2 is None:
        return {"mood": "neutral", "quote": "I'm here to support you whenever you're ready.", "desc": "The visual engine is warming up."}
    
    try:
        image_data = data.get("image")
        if not image_data or "," not in image_data:
            return {"mood": "neutral", "quote": "I couldn't catch that expression.", "desc": "Try adjusting your lighting or position."}
            
        header, encoded = image_data.split(",", 1)
        binary_data = base64.b64decode(encoded)
        nparr = np.frombuffer(binary_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Analyze with DeepFace
        objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        if objs:
            raw_mood = objs[0]['dominant_emotion'].lower()
            
            # Map DeepFace emotion to Aura's 6 stages
            mapping = {
                "happy": "happy",
                "sad": "sad",
                "neutral": "neutral",
                "angry": "frustrated",
                "fear": "stress",
                "surprise": "happy", # Surprise is often positive in this context
                "disgust": "frustrated"
            }
            mood = mapping.get(raw_mood, "neutral")
            
            import random
            quote_data = random.choice(MOOD_QUOTES.get(mood, MOOD_QUOTES["neutral"]))
            
            return {
                "mood": mood,
                "quote": f"\"{quote_data['quote']}\" — {quote_data['author']}",
                "desc": quote_data['desc']
            }
        return {"mood": "neutral", "quote": "Steady and focused.", "desc": "You're in a neutral state, perfect for building a balanced drive."}
    except Exception as e:
        print(f"Visual Analysis Error: {e}")
        return {"mood": "neutral", "quote": "Technical glitches happen, but your peace remains.", "desc": "I'm still here for you."}

@app.post("/journal/entries", response_model=EntryResponse)
async def create_entry(entry: EntryCreate, db: Session = Depends(get_db)):
    combined_text = f"Template: {entry.template_name}. Triggers: {entry.triggers}. Strategies: {entry.strategies}. Lessons: {entry.lessons}"
    prompt = f"""
    You are Aura, an elite empathetic AI counselor. The user is {entry.user_age} years old and identifies as {entry.user_gender}.
    
    CRITICAL INSTRUCTION: Analyze the user's input sentence-by-sentence. Address specific triggers, emotions, and thoughts mentioned. 
    AVOID repetitive or generic comfort. Every response MUST be uniquely tailored to the specific details provided.
    
    Emotional Reasoning Phase:
    1. Identify the core subtext of EACH sentence in: "{combined_text}"
    2. Consider how a {entry.user_age}-year-old {entry.user_gender} feels about these specific triggers.
    3. Determine the most helpful emotional shift for this specific context ({entry.template_name}).
    
    User State:
    - Primary Mood: {entry.overall_mood}
    - Specific Emotions: {", ".join(entry.specific_emotions)}
    - Intensity: {entry.intensity}/10
    
    Return ONLY a JSON object:
    {{
        "sentiment": float (-1 to 1),
        "emotion": "stress" | "anxiety" | "sad" | "happy" | "calm" | "focus",
        "suggestion": "2-3 detailed, empathetic paragraphs. Use newlines (\\n) between paragraphs. Reference at least 2 specific details from the user's input to show you listened.",
        "breathing_exercise": "A unique step-by-step technique tailored to their specific intensity.",
        "focus_music": "Specifically justified music choice (e.g., 'Binaural beats at 40Hz to help with the exam focus you mentioned').",
        "counselor_info": "Warm, specific guidance on next steps.",
        "quote": "A powerful, non-cliché quote matching their specific struggle.",
        "counselor_tips": ["Unique actionable tip 1", "Unique actionable tip 2", "Unique actionable tip 3"]
    }}
    """
    
    # --- Aura Shield: Critical Safety Check ---
    critical_keywords = ["suicide", "death", "kill myself", "end my life", "harm myself", "want to die", "commit suicide", "hanging", "overdose"]
    combined_text = f"{entry.triggers} {entry.strategies} {entry.lessons}".lower()
    
    is_critical = any(k in combined_text for k in critical_keywords)
    
    emergency_contacts = [
        {"name": "National Crisis Hotline", "phone": "988", "desc": "24/7 confidential support for people in distress."},
        {"name": "Emergency Services", "phone": "100", "desc": "Immediate police or ambulance intervention."},
        {"name": "Vandrevala Foundation", "phone": "9999666555", "desc": "Mental health support and crisis counseling."},
        {"name": "AASRA", "phone": "9820466726", "desc": "24/7 Suicide Prevention Helpline."}
    ]
    
    # Deeply Differentiated Mood Defaults
    mood_key = entry.overall_mood.lower()
    
    if mood_key == "happy":
        analysis = {
            "sentiment": 0.8, "emotion": "happy",
            "suggestion": "Your positivity is radiant! These moments of joy are essential for resilience. Let's amplify this feeling and perhaps set an intention to carry this light into the rest of your week.",
            "breathing_exercise": "The Joyful Expansion: Take 3 quick, deep 'sip' inhales through your nose, then one long, audible 'Ahhh' exhale through your mouth.",
            "focus_music": "Sunny Acoustic Vibes or Tropical Upbeat Instrumentals.",
            "counselor_info": "Savoring joy is a vital mental health skill. You're doing great!",
            "quote": "Joy is the simplest form of gratitude.",
            "counselor_tips": ["Write down the exact trigger of this joy", "Share a compliment with someone", "Take a celebratory 5-minute dance break"]
        }
    elif mood_key == "sad":
        analysis = {
            "sentiment": -0.5, "emotion": "sad",
            "suggestion": "I'm so sorry you're feeling this weight. It's completely valid to have low energy and feel blue. Be gentle with yourself tonight; you don't have to 'fix' this immediately.",
            "breathing_exercise": "Heart-Centered Sighing: Place a hand on your heart. Inhale deeply, and let out a long, heavy sigh. Repeat until your shoulders drop.",
            "focus_music": "Compassionate Cello or Soft Piano Melodies for processing.",
            "counselor_info": "Gentleness is your strength right now. You are allowed to take up space with your sadness.",
            "quote": "The soul would have no rainbow had the eyes no tears.",
            "counselor_tips": ["Wrap yourself in a warm blanket", "Drink a glass of water slowly", "Listen to one song that validates your feelings"]
        }
    elif mood_key == "anxious":
        analysis = {
            "sentiment": -0.4, "emotion": "anxiety",
            "suggestion": "When the mind races, we must anchor the body. You are safe in this moment. The future hasn't happened yet, and you have survived 100% of your hardest days.",
            "breathing_exercise": "4-7-8 Internal Anchor: Inhale for 4s, Hold for 7s (the reset), Exhale slowly for 8s through pursed lips.",
            "focus_music": "Weightless Ambient (Marconi Union style) or 528Hz Solfeggio frequencies.",
            "counselor_info": "Anxiety is often just a smoke detector that's a bit too sensitive. You are safe.",
            "quote": "No amount of anxiety makes any difference to anything that is going to happen.",
            "counselor_tips": ["5-4-3-2-1 Sensory Grounding", "Splash cold water on your face", "Limit caffeine for the next few hours"]
        }
    elif mood_key == "stressed":
        analysis = {
            "sentiment": -0.3, "emotion": "stress",
            "suggestion": "The load feels heavy because you're doing important work. Let's move from 'overwhelmed' to 'one small step'. What is the absolute simplest thing you can do next?",
            "breathing_exercise": "Tactical Box Breathing: Inhale 4, Hold 4, Exhale 4, Hold 4. This is used by professionals to regain clarity under pressure.",
            "focus_music": "Lo-fi Study Beats (60 BPM) or Alpha Wave Binaural Beats.",
            "counselor_info": "Stress is energy. Let's redirect it into manageable micro-tasks.",
            "quote": "It's not the load that breaks you, it's the way you carry it.",
            "counselor_tips": ["Clear your immediate workspace", "Write a 3-item To-Do list", "Take 2 minutes to stretch your neck and back"]
        }
    elif mood_key == "focus":
        analysis = {
            "sentiment": 0.4, "emotion": "focus",
            "suggestion": "You're in the zone! This state of flow is where your best version emerges. Let's protect this clarity and ensure you have everything you need to keep going.",
            "breathing_exercise": "Cognitive Clarity Breath: Quick, sharp inhales through the nose followed by powerful, focused exhales to oxygenate your brain.",
            "focus_music": "40Hz Gamma Binaural Beats or Deep Focus Techno (Minimal).",
            "counselor_info": "Flow is a peak human experience. Guard your focus from distractions.",
            "quote": "Focus is a matter of deciding what things you're not going to do.",
            "counselor_tips": ["Put your phone in another room", "Set a 25-minute Pomodoro timer", "Clear any open tabs you don't need"]
        }
    elif mood_key == "calm":
        analysis = {
            "sentiment": 0.5, "emotion": "calm",
            "suggestion": "This serenity is your natural state. Carry this peace with you; it is a reservoir you can return to whenever the world feels chaotic.",
            "breathing_exercise": "Ocean Breath (Ujjayi): Constrict the back of your throat slightly, making a soft 'ocean' sound as you breathe in and out slowly.",
            "focus_music": "Zen Garden Ambience or Nature Sounds (Birds and Streams).",
            "counselor_info": "Peace is not the absence of trouble, but the presence of stillness.",
            "quote": "Within you, there is a stillness and a sanctuary.",
            "counselor_tips": ["Observe your breath for 10 cycles", "Note one thing that brought you peace", "Walk slowly and feel your feet on the ground"]
        }
    else:
        # Generic fallback if mood is unknown
        analysis = {
            "sentiment": 0.0, "emotion": "neutral",
            "suggestion": f"I'm listening closely to your reflection on feeling {entry.overall_mood}. Let's explore these feelings together and find a path forward.",
            "breathing_exercise": "Simple Mindful Breathing: Just notice the inhale and notice the exhale.",
            "focus_music": "Neutral lo-fi piano.",
            "counselor_info": "Your reflections are the first step to understanding.",
            "quote": "To know thyself is the beginning of wisdom.",
            "counselor_tips": ["Close your eyes for 30s", "Lower your gaze", "Take a slow sip of tea"]
        }

    # Apply Aura Shield Override if Critical
    if is_critical:
        analysis["sentiment"] = -1.0
        analysis["is_critical"] = True
        analysis["emergency_contacts"] = emergency_contacts
        analysis["suggestion"] = "I hear how much pain you are in, and I want you to know that you are not alone. Your life has immense value, and there is support available right now to help you through this peak moment of darkness. Please reach out to one of the professionals below immediately—they are trained to listen and help you find a way forward safely."
        analysis["breathing_exercise"] = "The Anchor Breath (Immediate Grounding): Feel your feet flat on the floor. Inhale for 5 seconds, hold for 2, and exhale for 7. Focus purely on the sensation of your feet on the ground. Repeat and reach for help."
        analysis["quote"] = "Your story isn't over yet; the world still needs the light that only you can bring."
        analysis["counselor_tips"] = ["Call an emergency contact immediately", "Distance yourself from any harmful objects", "Stay on the phone with a trusted person until help arrives"]

    # Keyword-based Contextual Overrides
    text_lower = combined_text.lower()
    
    # Only override with academic stress if the user isn't already happy
    if mood_key not in ["happy", "calm", "focus"]:
        if any(k in text_lower for k in ["exam", "test", "study", "project", "assignment"]):
            analysis["suggestion"] = f"Academic pressure can definitely weigh on you. Remember that your worth is not defined by grades or {next((k for k in ['exam', 'test', 'study', 'project', 'assignment'] if k in text_lower), 'study levels')}. You have the tools to handle this."
            analysis["emotion"] = "stress"
            analysis["breathing_exercise"] = "Tactical Focus: Inhale 4s, Hold 2s, Exhale 6s."
    
    if any(k in text_lower for k in ["alone", "lonely", "argument", "fight"]):
        if mood_key != "happy":
            analysis["suggestion"] = "Social interactions and feelings of isolation can be deeply challenging. Your need for connection is valid, and it's okay to feel this way."
            analysis["emotion"] = "sad"
            analysis["breathing_exercise"] = "Heart-Centered Sigh: Inhale joy, exhale the weight."

    import time
    max_retries = 2
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            text = response.text
            text = text.replace("```json", "").replace("```", "").strip()
            import json
            analysis_res = json.loads(text)
            
            # Ensure AI doesn't give same generic stuff
            if len(analysis_res.get("suggestion", "")) > 10:
                analysis.update(analysis_res)
            break 
        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                time.sleep(2) 
                continue
            with open("ai_error.log", "a") as f:
                f.write(f"[{datetime.datetime.now()}] AI Error on attempt {attempt+1}: {str(e)}\n")

    import json
    db_entry = JournalEntry(
        content=entry.triggers,
        reflection_date=entry.reflection_date,
        overall_mood=entry.overall_mood,
        specific_emotions=",".join(entry.specific_emotions),
        strategies=entry.strategies,
        intensity=entry.intensity,
        lessons_learned=entry.lessons,
        template_name=entry.template_name,
        user_age=entry.user_age,
        user_gender=entry.user_gender,
        user_phone=entry.user_phone,
        sentiment_score=float(analysis.get("sentiment", 0.0)),
        emotion=str(analysis.get("emotion", analysis["emotion"])),
        suggestion=str(analysis.get("suggestion", analysis["suggestion"])),
        breathing_exercise=str(analysis.get("breathing_exercise", analysis["breathing_exercise"])),
        focus_music=str(analysis.get("focus_music", analysis["focus_music"])),
        counselor_info=str(analysis.get("counselor_info", analysis["counselor_info"])),
        quote=str(analysis.get("quote", analysis["quote"])),
        counselor_tips=json.dumps(analysis.get("counselor_tips", analysis["counselor_tips"]))
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    # Return a response dictionary that includes the critical safety flags
    # We use model_validate to ensure it matches the Pydantic schema
    response_data = EntryResponse.model_validate(db_entry).model_dump()
    response_data["is_critical"] = analysis.get("is_critical", False)
    response_data["emergency_contacts"] = analysis.get("emergency_contacts", [])
    
    return response_data

@app.get("/journal/entries", response_model=List[EntryResponse])
def get_entries(db: Session = Depends(get_db)):
    return db.query(JournalEntry).order_by(JournalEntry.created_at.desc()).all()

@app.get("/mood/stats")
def get_mood_stats(range: str = "week", db: Session = Depends(get_db)):
    # Calculate start date based on range
    now = datetime.datetime.utcnow()
    if range == "day":
        start_date = now - datetime.timedelta(days=1)
    elif range == "week":
        start_date = now - datetime.timedelta(weeks=1)
    elif range == "month":
        start_date = now - datetime.timedelta(days=30)
    else:
        start_date = now - datetime.timedelta(weeks=1)

    entries = db.query(JournalEntry).filter(JournalEntry.created_at >= start_date).order_by(JournalEntry.created_at.asc()).all()
    labels = [e.created_at.strftime("%Y-%m-%d %H:%M") for e in entries]
    scores = [e.sentiment_score for e in entries]
    return {"labels": labels, "scores": scores, "current_range": range}

@app.delete("/data/clear")
def clear_data(db: Session = Depends(get_db)):
    db.query(JournalEntry).delete()
    db.commit()
    return {"message": "All entries deleted."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
