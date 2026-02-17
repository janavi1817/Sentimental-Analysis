import streamlit as st
import pandas as pd
import numpy as np
import requests
import os
import base64
import json
import datetime
from PIL import Image
from dotenv import load_dotenv
from streamlit_option_menu import option_menu

load_dotenv()

# Configuration
API_BASE = "http://localhost:8000"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

st.set_page_config(
    page_title="Aura | Multi-Modal Wellness",
    page_icon="🌊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styles
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap');
    
    * { font-family: 'Outfit', sans-serif; }
    
    .stApp {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    }
    
    .glass-card {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        border-radius: 24px;
        padding: 30px;
        border: 1px solid rgba(255, 255, 255, 0.5);
        box-shadow: 0 8px 32px rgba(0,0,0,0.05);
        margin-bottom: 20px;
    }
    
    .aura-header {
        font-weight: 900;
        color: #1e3a8a;
        letter-spacing: -1px;
    }
    
    .mood-chip {
        padding: 8px 16px;
        border-radius: 50px;
        font-weight: bold;
        display: inline-block;
        margin-right: 10px;
    }
    
    .stButton > button {
        border-radius: 50px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 1px;
        transition: all 0.3s;
    }
    
    .sidebar .sidebar-content {
        background: #1e3a8a !important;
    }
</style>
""", unsafe_allow_html=True)

# State Management
if 'stage' not in st.session_state:
    st.session_state.stage = 'landing'
if 'user_data' not in st.session_state:
    st.session_state.user_data = {"name": "", "age": 18, "gender": "Female", "phone": ""}
if 'persistent_resources' not in st.session_state:
    st.session_state.persistent_resources = {
        "breathing": "Calm your mind. Inhale for 4, hold for 4, exhale for 4.",
        "music": "Lofi Beats - Chill Study Music",
        "tip": "Take a deep breath and stay present."
    }

def set_stage(stage):
    st.session_state.stage = stage

# Helper: Fetch Entries and Sync Resources
def sync_resources():
    try:
        res = requests.get(f"{API_BASE}/journal/entries")
        if res.status_code == 200:
            entries = res.json()
            if entries:
                latest = entries[0]
                st.session_state.persistent_resources = {
                    "breathing": latest.get("breathing_exercise", st.session_state.persistent_resources["breathing"]),
                    "music": latest.get("focus_music", st.session_state.persistent_resources["music"]),
                    "tip": latest.get("counselor_info", st.session_state.persistent_resources["tip"])
                }
    except:
        pass

# Landing Page
if st.session_state.stage == 'landing':
    st.markdown("<div style='text-align: center; padding: 100px 20px;'>", unsafe_allow_html=True)
    st.markdown("<h1 class='aura-header' style='font-size: 80px; margin-bottom: 10px;'>AURA</h1>", unsafe_allow_html=True)
    st.markdown("<h3 style='color: #64748b; font-weight: 400; font-style: italic; margin-bottom: 40px;'>Your Digital Sanctuary for Mental Well-being.</h3>", unsafe_allow_html=True)
    
    if st.button("ENTER THE SANCTUARY", use_container_width=True):
        set_stage('login')
    st.markdown("</div>", unsafe_allow_html=True)

# Login Page
elif st.session_state.stage == 'login':
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<h2 class='aura-header'>IDENTIFY YOURSELF</h2>", unsafe_allow_html=True)
        
        name = st.text_input("Preferred Name")
        age = st.number_input("Age", min_value=1, max_value=120, value=18)
        gender = st.selectbox("Gender Identity", ["Female", "Male", "Non-Binary", "Other"])
        phone = st.text_input("Emergency Contact Number")
        
        if st.button("BEGIN REFLECTION", use_container_width=True):
            if name and phone:
                st.session_state.user_data = {"name": name, "age": age, "gender": gender, "phone": phone}
                sync_resources()
                set_stage('app')
            else:
                st.error("Please fill in all fields.")
        st.markdown("</div>", unsafe_allow_html=True)

# Main Application
elif st.session_state.stage == 'app':
    with st.sidebar:
        st.markdown(f"<h1 class='aura-header' style='color: #fff;'>AURA</h1>", unsafe_allow_html=True)
        st.markdown(f"<p style='color: #bfdbfe; font-style: italic; font-size: 14px;'>Welcome, {st.session_state.user_data['name']}</p>", unsafe_allow_html=True)
        
        selected = option_menu(
            menu_title=None,
            options=["Dashboard", "Sanctuary", "Stats", "Help"],
            icons=["house", "cloud-sun", "graph-up", "question-circle"],
            menu_icon="cast",
            default_index=0,
            styles={
                "container": {"padding": "0!important", "background-color": "transparent"},
                "icon": {"color": "#bfdbfe", "font-size": "20px"},
                "nav-link": {"font-size": "16px", "text-align": "left", "margin": "0px", "--hover-color": "#2563eb", "color": "#fff", "font-weight": "600"},
                "nav-link-selected": {"background-color": "#2563eb"},
            }
        )
        
        if st.button("LOGOUT", use_container_width=True):
            set_stage('landing')

    if selected == "Dashboard":
        st.markdown("<h2 class='aura-header'>MOOD ANALYSIS INTERFACE</h2>", unsafe_allow_html=True)
        
        col1, col2 = st.columns([1, 1])
        
        with col1:
            st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
            st.markdown("<h4>📷 Visual Mood Detection</h4>", unsafe_allow_html=True)
            img_file = st.camera_input("Check your aura")
            
            if img_file:
                bytes_data = img_file.getvalue()
                base64_image = base64.b64encode(bytes_data).decode('utf-8')
                
                try:
                    res = requests.post(f"{API_BASE}/analyze-visual", json={"image": f"data:image/jpeg;base64,{base64_image}"})
                    if res.status_code == 200:
                        visual_data = res.json()
                        st.session_state.current_mood = visual_data['mood']
                        st.success(f"Detected Mood: {visual_data['mood'].upper()}")
                        st.info(f"💡 {visual_data['desc']}")
                except:
                    st.error("Connection to vision engine failed.")
            st.markdown("</div>", unsafe_allow_html=True)
            
        with col2:
            st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
            st.markdown("<h4>✍️ Reflective Journal</h4>", unsafe_allow_html=True)
            mood = st.selectbox("Current Feeling", ["neutral", "happy", "sad", "stressed", "anxious", "focus", "calm"])
            emotions = st.multiselect("Specific Emotions", ["Tired", "Excited", "Overwhelmed", "Peaceful", "Lonely", "Grateful"])
            content = st.text_area("Tell Aura what's on your mind...", height=150)
            
            if st.button("CHAT WITH BOT", use_container_width=True):
                if content:
                    payload = {
                        "reflection_date": datetime.datetime.now().strftime("%m-%d-%Y"),
                        "overall_mood": mood,
                        "specific_emotions": emotions,
                        "triggers": content,
                        "strategies": "Reflecting via Streamlit",
                        "intensity": 5,
                        "lessons": "Seeking clarity",
                        "user_age": st.session_state.user_data['age'],
                        "user_gender": st.session_state.user_data['gender'],
                        "user_phone": st.session_state.user_data['phone']
                    }
                    
                    with st.spinner("Aura is listening..."):
                        try:
                            res = requests.post(f"{API_BASE}/journal/entries", json=payload)
                            if res.status_code == 200:
                                bot_res = res.json()
                                st.session_state.bot_message = bot_res
                                st.session_state.persistent_resources = {
                                    "breathing": bot_res['breathing_exercise'],
                                    "music": bot_res['focus_music'],
                                    "tip": bot_res['counselor_info']
                                }
                                st.rerun()
                        except:
                            st.error("Backend communication failed.")
                else:
                    st.warning("Please share some thoughts first.")
            st.markdown("</div>", unsafe_allow_html=True)

        if 'bot_message' in st.session_state:
            with st.container():
                st.markdown("---")
                bm = st.session_state.bot_message
                
                # Header
                st.subheader(f"AI Counselor: {bm.get('emotion', 'Neutral').title()}")
                st.markdown(f"*{bm.get('quote', '')}*")
                
                # Suggestion Text
                suggestion_text = bm.get('suggestion', '')
                if suggestion_text:
                    for p in suggestion_text.split('\n'):
                        if p.strip():
                            st.write(p.strip())
                
                st.markdown("---")
                
                # Action Items
                c1, c2 = st.columns(2)
                with c1:
                    st.info(f"**Breathing Exercise**\n\n{bm.get('breathing_exercise', 'Deep breathing...')}")
                with c2:
                    st.success(f"**Focus Music**\n\n{bm.get('focus_music', 'Calming Lofi')}")

    elif selected == "Sanctuary":
        st.markdown("<h2 class='aura-header'>THE SANCTUARY</h2>", unsafe_allow_html=True)
        st.markdown("<p style='font-style: italic; color: #64748b;'>Your persistent space for deep breathing and focus music.</p>", unsafe_allow_html=True)
        
        pr = st.session_state.persistent_resources
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("<div class='glass-card' style='background: linear-gradient(to bottom right, #eff6ff, #ffffff);'>", unsafe_allow_html=True)
            st.markdown("<h4>🌬️ Breath of Life</h4>", unsafe_allow_html=True)
            st.markdown(f"<p style='padding: 20px; background: rgba(255,255,255,0.5); border-radius: 15px; border: 1px solid #dbeafe;'>{pr['breathing']}</p>", unsafe_allow_html=True)
            st.button("Listen to Guide", key="breath_tts", use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)
            
        with col2:
            st.markdown("<div class='glass-card' style='background: linear-gradient(to bottom right, #faf5ff, #ffffff);'>", unsafe_allow_html=True)
            st.markdown("<h4>🎵 Aura Radio</h4>", unsafe_allow_html=True)
            st.markdown(f"<p style='padding: 20px; background: rgba(255,255,255,0.5); border-radius: 15px; border: 1px solid #f3e8ff;'>{pr['music']}</p>", unsafe_allow_html=True)
            st.button("Open Focus Player", key="radio_btn", use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)
            
        st.markdown("<div class='glass-card' style='background: #fffbeb;'>", unsafe_allow_html=True)
        st.markdown(f"<h4>☕ Daily Soul Tip</h4>", unsafe_allow_html=True)
        st.markdown(f"<p style='font-weight: 500; color: #92400e;'>{pr['tip']}</p>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    elif selected == "Stats":
        st.markdown("<h2 class='aura-header'>EMOTIONAL WAVES</h2>", unsafe_allow_html=True)
        try:
            res = requests.get(f"{API_BASE}/mood/stats?range=week")
            if res.status_code == 200:
                stats = res.json()
                if stats['labels']:
                    df = pd.DataFrame({"Date": stats['labels'], "Score": stats['scores']})
                    st.line_chart(df.set_index("Date"))
                    st.info("Tracking your emotional peaks and valleys over the last 7 days.")
                else:
                    st.warning("No waves detected yet. Start journaling to see your stats!")
        except:
            st.error("Could not fetch emotional statistics.")

    elif selected == "Help":
        st.markdown("<h2 class='aura-header'>SUPPORT RESOURCES</h2>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("📱 **Vandrevala Foundation**: 9999 666 555")
        st.markdown("📱 **iCall (TISS)**: 022-25521111")
        st.error("In case of immediate danger, please contact local emergency services.")
        st.markdown("</div>", unsafe_allow_html=True)
