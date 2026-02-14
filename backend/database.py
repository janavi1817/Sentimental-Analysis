from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./aura.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)  # This will store the main journal text or "Triggers"
    reflection_date = Column(String)  # MM-DD-YYYY
    overall_mood = Column(String)
    specific_emotions = Column(String)  # Comma separated
    strategies = Column(Text)
    intensity = Column(Integer)
    lessons_learned = Column(Text)
    template_name = Column(String)
    user_age = Column(Integer, default=18)
    user_gender = Column(String, default="Female")
    user_phone = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    sentiment_score = Column(Float)  # -1 (negative) to 1 (positive)
    emotion = Column(String)  # AI detected emotion
    suggestion = Column(Text)
    breathing_exercise = Column(Text)
    focus_music = Column(Text)
    counselor_info = Column(Text)
    quote = Column(Text)
    counselor_tips = Column(Text) # Stored as JSON string or text

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    phone_number = Column(String)
    is_anonymous = Column(Integer, default=0) # 1 for anonymous users

Base.metadata.create_all(bind=engine)
