import sqlite3
import json

conn = sqlite3.connect('C:/Users/Janavipatel/.gemini/antigravity/scratch/aura-mental-health/backend/aura.db')
cursor = conn.cursor()

cursor.execute("SELECT id, overall_mood, content, emotion, suggestion FROM journal_entries ORDER BY id DESC LIMIT 8")
rows = cursor.fetchall()

for row in rows:
    print(f"ID: {row[0]}")
    print(f"Mood: {row[1]}")
    print(f"Input: {row[2]}")
    print(f"AI Emotion: {row[3]}")
    print(f"AI Suggestion: {row[4]}")
    print("-" * 50)

conn.close()
