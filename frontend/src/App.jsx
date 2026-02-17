import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Heart,
    MessageSquare,
    LineChart,
    Settings,
    HelpCircle,
    Activity,
    Wind,
    Music,
    Trash2,
    Calendar,
    Home,
    Camera,
    RefreshCw,
    Mic,
    Volume2,
    Cloud,
    Coffee,
    CloudRain
} from 'lucide-react';
import Webcam from 'react-webcam';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const API_BASE = import.meta.env.PROD ? "" : "http://localhost:8000";

const initialForm = {
    reflection_date: new Date().toISOString().split('T')[0],
    overall_mood: '',
    specific_emotions: [],
    triggers: '',
    strategies: '',
    intensity: 5,
    lessons: '',
    template_name: 'General'
};

const speak = (text) => {
    if (!text) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }
};

const VoiceInput = ({ onTranscript, placeholder = "Speak your thoughts..." }) => {
    const [listening, setListening] = useState(false);
    const recognitionRef = React.useRef(null);

    const toggleListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (listening) {
            recognitionRef.current.stop();
            setListening(false);
        } else {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) onTranscript(finalTranscript);
            };

            recognition.onstart = () => setListening(true);
            recognition.onend = () => setListening(false);
            recognition.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                setListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    return (
        <button
            onClick={toggleListening}
            className={`p-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-[10px] ${listening
                ? 'bg-rose-500 text-white animate-pulse shadow-lg scale-105'
                : 'bg-white/60 text-slate-600 hover:bg-white hover:shadow-md'
                }`}
        >
            <Mic size={18} className={listening ? 'animate-bounce' : ''} />
            {listening ? "Aura is Listening..." : "Dictate Thoughts"}
        </button>
    );
};

const TEMPLATES = [
    {
        name: "The Daily Pulse",
        desc: "A quick check-in for your mood, triggers, and highlights of the day.",
        icon: <Activity />,
        theme: "blue",
        modalIntro: "Ready to decode your day?",
        btnColor: "bg-blue-600 hover:bg-blue-700",
        analysisTitle: "Daily Mood Scan",
        analysisBtn: "Analyze My Day",
        analysisInstruction: "Show us how your day went—smile, frown, or just be you.",
        botBg: "bg-blue-50/50",
        botAccent: "text-blue-600",
        botBubble: "bg-blue-100 border-blue-200",
        botGreet: "How has the rhythm of your day been so far?",
        moodOptions: ['Energized', 'Productive', 'Neutral', 'Tired', 'Low Energy']
    },
    {
        name: "Anxiety Anchor",
        desc: "Designed to help you identify stressors and use grounding techniques to find calm.",
        icon: <Wind />,
        theme: "teal",
        modalIntro: "Let's find your center.",
        btnColor: "bg-teal-600 hover:bg-teal-700",
        analysisTitle: "Tension & Calm Scanner",
        analysisBtn: "Check My Calm Levels",
        analysisInstruction: "Take a deep breath. We'll look for signs of tension to help you release it.",
        botBg: "bg-teal-50/50",
        botAccent: "text-teal-600",
        botBubble: "bg-teal-100 border-teal-200",
        botGreet: "I'm here with you. How is your breath feeling right now?",
        moodOptions: ['Overwhelmed', 'Restless', 'Tense', 'Grounding', 'Peaceful']
    },
    {
        name: "Gratitude Horizon",
        desc: "Focus on the positive by listing three things you are thankful for today.",
        icon: <Heart />,
        theme: "gold",
        modalIntro: "Shift your perspective to abundance.",
        btnColor: "bg-amber-500 hover:bg-amber-600",
        analysisTitle: "Joy & Appreciation Scan",
        analysisBtn: "Capture My Gratitude",
        analysisInstruction: "Think of something that made you smile today. Let's capture that warmth.",
        botBg: "bg-amber-50/50",
        botAccent: "text-amber-600",
        botBubble: "bg-amber-100 border-amber-200",
        botGreet: "What beautiful moment can we celebrate today?",
        moodOptions: ['Thankful', 'Inspired', 'Loved', 'Content', 'Blessed']
    },
    {
        name: "The Academic Edge",
        desc: "Manage study pressure, track focus levels, and celebrate learning wins.",
        icon: <MessageSquare />,
        theme: "indigo",
        modalIntro: "Sharpen your focus and crush your goals.",
        btnColor: "bg-indigo-600 hover:bg-indigo-700",
        analysisTitle: "Focus & Burnout Detector",
        analysisBtn: "Analyze Study Focus",
        analysisInstruction: "Are you locked in or burnt out? Let's check your energy levels.",
        botBg: "bg-indigo-50/50",
        botAccent: "text-indigo-600",
        botBubble: "bg-indigo-100 border-indigo-200",
        botGreet: "Ready for a deep work session? How's your mental clarity?",
        moodOptions: ['Focused', 'Determined', 'Burnt out', 'Procrastinating', 'Confused']
    },
    {
        name: "Nightfall Peace",
        desc: "Soft reflections to clear your mind and prepare for a restful, deep sleep.",
        icon: <Activity />,
        theme: "slate",
        modalIntro: "Unwind and let go of the day.",
        btnColor: "bg-slate-600 hover:bg-slate-700",
        analysisTitle: "Sleep Readiness Scan",
        analysisBtn: "Check Sleep Vibes",
        analysisInstruction: "Relax your shoulders. Let's see if you're ready to drift off.",
        botBg: "bg-slate-100/50",
        botAccent: "text-slate-600",
        botBubble: "bg-slate-200 border-slate-300",
        botGreet: "The world is quiet now. What's lingering on your mind?",
        moodOptions: ['Sleepy', 'Reflective', 'Quiet', 'Heavy', 'Restful']
    },
    {
        name: "Inner Compass",
        desc: "Deep dive into your personal values, growth, and what truly matters to you.",
        icon: <LineChart />,
        theme: "sage",
        modalIntro: "Align with your true self.",
        btnColor: "bg-emerald-600 hover:bg-emerald-700",
        analysisTitle: "Core Values Alignment",
        analysisBtn: "Read My Reflection",
        analysisInstruction: "Look inward. We'll analyze the depth of your current emotion.",
        botBg: "bg-emerald-50/50",
        botAccent: "text-emerald-600",
        botBubble: "bg-emerald-100 border-emerald-200",
        botGreet: "Let's explore your internal landscape. What are you sensing?",
        moodOptions: ['Purposeful', 'Lost', 'Growing', 'Skeptical', 'Authentic']
    },
    {
        name: "Morning Spark",
        desc: "Start your day with intention by setting goals and positive affirmations.",
        icon: <Wind />,
        theme: "yellow",
        modalIntro: "Ignite your potential for today.",
        btnColor: "bg-yellow-500 hover:bg-yellow-600",
        analysisTitle: "Morning Energy Check",
        analysisBtn: "Ignite My Day",
        analysisInstruction: "Show us your morning face! Are you ready to conquer the day?",
        botBg: "bg-yellow-50/50",
        botAccent: "text-yellow-600",
        botBubble: "bg-yellow-100 border-yellow-200",
        botGreet: "A new day begins. What intention are you bringing to it?",
        moodOptions: ['Ambitious', 'Hopeful', 'Fresh', 'Still Waking Up', 'Focused']
    },
    {
        name: "The Social Web",
        desc: "Reflect on your interactions, social energy, and boundary setting in friendships.",
        icon: <MessageSquare />,
        theme: "lavender",
        modalIntro: "Navigate your connections with clarity.",
        btnColor: "bg-purple-500 hover:bg-purple-600",
        analysisTitle: "Social Battery Scan",
        analysisBtn: "Check Social Energy",
        analysisInstruction: "Feeling drained or energized by others? Let's read your social cues.",
        botBg: "bg-purple-50/50",
        botAccent: "text-purple-600",
        botBubble: "bg-purple-100 border-purple-200",
        botGreet: "Reflecting on your interactions—how is your social battery?",
        moodOptions: ['Socially Charged', 'Drained', 'Connected', 'Misunderstood', 'Heard']
    },
    {
        name: "The Clearing",
        desc: "No rules, no structure—just a free-flowing space for your mental unloading.",
        icon: <Trash2 />,
        theme: "minimal",
        modalIntro: "Speak your mind, freely.",
        btnColor: "bg-slate-800 hover:bg-slate-900",
        analysisTitle: "Raw Emotion Scanner",
        analysisBtn: "Unload My Mind",
        analysisInstruction: "No filters. Just show us exactly how you feel right now.",
        botBg: "bg-slate-100",
        botAccent: "text-slate-900",
        botBubble: "bg-white border-slate-200",
        botGreet: "No filters here. What needs to be released?",
        moodOptions: ['Venting', 'Raw', 'Intense', 'Relieved', 'Heavy-hearted']
    },
];

const LandingPage = ({ onEnter }) => (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
        <BeachBackground />
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 max-w-2xl w-full text-center space-y-10 relative z-10 backdrop-blur-2xl border-white/60 border-2"
        >
            <div className="flex flex-col items-center gap-6">
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="p-6 bg-white/40 rounded-full shadow-inner"
                >
                    <Heart className="text-rose-500 w-20 h-20 fill-rose-500" />
                </motion.div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-black text-aura-darkBlue tracking-tight">Welcome to Aura</h1>
                    <p className="text-lg font-bold text-slate-600 italic">Your personal digital sanctuary for mental wellness.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {[
                    { icon: <Activity className="text-blue-500" />, title: "Mood Analysis", desc: "AI-powered emotional tracking." },
                    { icon: <Wind className="text-cyan-500" />, title: "Sanctuary", desc: "Persistent wellness resources." },
                    { icon: <Volume2 className="text-purple-500" />, title: "Voice & Vision", desc: "Multi-modal counseling." }
                ].map((feature, i) => (
                    <div key={i} className="p-4 bg-white/40 rounded-2xl border border-white/40 space-y-2">
                        {feature.icon}
                        <h4 className="text-xs font-black text-aura-darkBlue">{feature.title}</h4>
                        <p className="text-[9px] font-medium text-slate-500 leading-tight">{feature.desc}</p>
                    </div>
                ))}
            </div>

            <button
                onClick={onEnter}
                className="w-full bg-aura-darkBlue text-white py-6 rounded-full font-black text-xl shadow-2xl hover:bg-blue-900 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-4 group"
            >
                Enter the Sanctuary
                <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <Home size={24} />
                </motion.div>
            </button>

            <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Safe • Private • Compassionate</p>
        </motion.div>
    </div>
);

const BeachBackground = () => (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Sky / Sunset */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-orange-100 to-amber-100" />

        {/* Ocean Waves */}
        <motion.div
            animate={{
                y: [0, 15, 0],
                rotate: [0, 1, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] left-[-10%] right-[-10%] h-[60%] bg-blue-500/30 blur-3xl rounded-[100%] opacity-50"
        />
        <motion.div
            animate={{
                y: [0, -20, 0],
                rotate: [0, -0.5, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-20%] left-[-20%] right-[-20%] h-[70%] bg-cyan-400/20 blur-[100px] rounded-[100%] opacity-40"
        />

        {/* Sand */}
        <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-[#f3e5ab] shadow-[0_-50px_100px_rgba(243,229,171,0.8)]" />

        {/* Subtle Sun Glow */}
        <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-orange-400/20 blur-[120px] rounded-full" />
    </div>
);

const WebcamAnalyzer = ({ onMoodDetected, template }) => {
    const webcamRef = React.useRef(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [lastMood, setLastMood] = useState(null);
    const [lastQuote, setLastQuote] = useState(null);
    const [lastDesc, setLastDesc] = useState(null);
    const [audioMood, setAudioMood] = useState(null);

    const captureAndAnalyze = async () => {
        if (!webcamRef.current) return;
        setAnalyzing(true);

        try {
            // 1. Capture Visual Screenshot
            const imageSrc = webcamRef.current.getScreenshot();

            // 2. Capture Audio (3 seconds)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
            mediaRecorder.start();

            await new Promise(resolve => setTimeout(resolve, 3000));
            mediaRecorder.stop();

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const audioBase64 = reader.result.split(',')[1];

                    try {
                        // Send both visual and audio data
                        const res = await axios.post(`${API_BASE}/analyze-multi-modal`, {
                            image: imageSrc,
                            audio: audioBase64
                        });

                        if (res.data.mood) {
                            setLastMood(res.data.mood);
                            setLastQuote(res.data.quote);
                            setLastDesc(res.data.desc);
                            setAudioMood(res.data.audio_mood);
                            onMoodDetected(res.data.mood);
                            speak(res.data.quote + ". " + res.data.desc);
                        }
                    } catch (err) {
                        console.error("Multi-modal Analysis Error:", err);
                    } finally {
                        setAnalyzing(false);
                        stream.getTracks().forEach(track => track.stop());
                    }
                };
            };
        } catch (e) {
            console.error("Capture Error:", e);
            setAnalyzing(false);
        }
    };

    return (
        <div className={`glass-card p-6 bg-white/40 border-4 space-y-4 relative overflow-hidden transition-all ${template?.theme === 'blue' ? 'border-blue-200' :
            template?.theme === 'teal' ? 'border-teal-200' :
                template?.theme === 'gold' ? 'border-amber-200' :
                    template?.theme === 'indigo' ? 'border-indigo-200' :
                        template?.theme === 'slate' ? 'border-slate-200' :
                            template?.theme === 'sage' ? 'border-emerald-200' :
                                template?.theme === 'yellow' ? 'border-yellow-200' :
                                    template?.theme === 'lavender' ? 'border-purple-200' :
                                        template?.theme === 'peach' ? 'border-orange-200' : 'border-white/60'
            }`}>
            {/* Dynamic Ambient Glow */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-[60px] opacity-40 rounded-full pointer-events-none ${template?.theme === 'blue' ? 'bg-blue-400' :
                template?.theme === 'teal' ? 'bg-teal-400' :
                    template?.theme === 'gold' ? 'bg-amber-400' :
                        template?.theme === 'indigo' ? 'bg-indigo-400' :
                            template?.theme === 'slate' ? 'bg-slate-400' :
                                template?.theme === 'sage' ? 'bg-emerald-400' :
                                    template?.theme === 'yellow' ? 'bg-yellow-400' :
                                        template?.theme === 'lavender' ? 'bg-purple-400' :
                                            template?.theme === 'peach' ? 'bg-orange-400' : 'bg-transparent'
                }`} />

            <div className="flex items-center justify-between relative z-10">
                <h4 className={`text-xs font-black flex items-center gap-2 ${template?.theme === 'blue' ? 'text-blue-800' :
                    template?.theme === 'teal' ? 'text-teal-800' :
                        template?.theme === 'gold' ? 'text-amber-800' :
                            template?.theme === 'indigo' ? 'text-indigo-800' :
                                template?.theme === 'slate' ? 'text-slate-800' :
                                    template?.theme === 'sage' ? 'text-emerald-800' :
                                        template?.theme === 'yellow' ? 'text-yellow-800' :
                                            template?.theme === 'lavender' ? 'text-purple-800' :
                                                template?.theme === 'peach' ? 'text-orange-800' : 'text-aura-darkBlue'
                    }`}>
                    <Camera size={20} /> {template?.analysisTitle || "Visual Mood Analysis"}
                </h4>
                {lastMood && (
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${template?.theme === 'blue' ? 'bg-blue-100 text-blue-700' :
                            template?.theme === 'teal' ? 'bg-teal-100 text-teal-700' :
                                template?.theme === 'gold' ? 'bg-amber-100 text-amber-700' :
                                    template?.theme === 'indigo' ? 'bg-indigo-100 text-indigo-700' :
                                        template?.theme === 'slate' ? 'bg-slate-100 text-slate-700' :
                                            template?.theme === 'sage' ? 'bg-emerald-100 text-emerald-700' :
                                                template?.theme === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                                                    template?.theme === 'lavender' ? 'bg-purple-100 text-purple-700' :
                                                        template?.theme === 'peach' ? 'bg-orange-100 text-orange-700' : 'bg-aura-blue text-aura-darkBlue'
                            }`}>
                            Visual: {lastMood}
                        </span>
                        {audioMood && (
                            <span className="px-3 py-1 bg-white/50 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-widest border border-slate-200">
                                Vocal: {audioMood}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-200 border-4 border-white/50 shadow-inner">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover"
                        videoConstraints={{ facingMode: "user" }}
                    />
                    {analyzing && (
                        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <RefreshCw className="animate-spin text-white w-12 h-12" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-center space-y-4">
                    <AnimatePresence mode="wait">
                        {lastQuote ? (
                            <motion.div
                                key={lastQuote}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-4"
                            >
                                <div className={`p-4 bg-white/80 rounded-2xl border-l-4 shadow-sm ${template?.theme === 'blue' ? 'border-l-blue-500' :
                                    template?.theme === 'teal' ? 'border-l-teal-500' :
                                        template?.theme === 'gold' ? 'border-l-amber-500' :
                                            template?.theme === 'indigo' ? 'border-l-indigo-500' :
                                                template?.theme === 'slate' ? 'border-l-slate-500' :
                                                    template?.theme === 'sage' ? 'border-l-emerald-500' :
                                                        template?.theme === 'yellow' ? 'border-l-yellow-500' :
                                                            template?.theme === 'lavender' ? 'border-l-purple-500' :
                                                                template?.theme === 'peach' ? 'border-l-orange-500' : 'border-l-aura-darkBlue'
                                    }`}>
                                    <p className="text-xs font-black text-slate-800 italic leading-tight mb-2">
                                        {lastQuote}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-600 leading-relaxed">
                                        {lastDesc}
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                                <Activity className="text-slate-300 mb-2" size={32} />
                                <p className="text-[10px] font-bold text-slate-400">{template?.analysisInstruction || "Scan your expression to unlock a personalized insight."}</p>
                            </div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={captureAndAnalyze}
                        disabled={analyzing}
                        className={`w-full py-4 text-white rounded-2xl font-black text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${template?.btnColor || 'bg-aura-darkBlue'
                            }`}
                    >
                        {analyzing ? "Analyzing Expression..." : (template?.analysisBtn || "Scan My Expression")}
                        {!analyzing && <Activity size={20} />}
                    </button>
                </div>
            </div>
            <p className="text-[9px] text-slate-500 font-medium text-center italic">AI will analyze your facial expressions to better understand your current state.</p>
        </div>
    );
};

const AuraShieldAlert = ({ isOpen, onClose, contacts }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white rounded-[40px] max-w-2xl w-full overflow-hidden shadow-2xl border-4 border-rose-500/30"
                >
                    <div className="bg-rose-600 p-8 text-white relative">
                        <div className="absolute top-6 right-8 cursor-pointer" onClick={onClose}>
                            <Heart className="w-8 h-8 rotate-45" />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-white/20 p-3 rounded-2xl">
                                <Activity className="w-8 h-8 text-white animate-pulse" />
                            </div>
                            <h2 className="text-lg font-black tracking-tight">Aura Shield: Safety Protocol</h2>
                        </div>
                        <p className="text-rose-100 text-xs font-bold leading-relaxed italic">
                            "You are not alone. There is a way through this, and we are here to help you find it."
                        </p>
                    </div>

                    <div className="p-10 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Immediate Support Needed?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {contacts && contacts.map((contact, idx) => (
                                    <div key={idx} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 hover:border-rose-200 transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-black text-slate-800">{contact.name}</h4>
                                            <a
                                                href={`tel:${contact.phone}`}
                                                className="bg-rose-600 text-white px-4 py-2 rounded-full text-[9px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
                                            >
                                                DIAL {contact.phone}
                                            </a>
                                        </div>
                                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed">{contact.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 space-y-3">
                            <div className="flex items-center gap-2 text-blue-800 font-bold">
                                <Wind size={20} /> <span>Quick Grounding Tip</span>
                            </div>
                            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                Take one deep breath. Feel your feet on the floor. If you're in immediate danger, please call emergency services right now.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-5 bg-slate-800 text-white rounded-full font-black text-sm hover:bg-slate-700 transition-colors"
                        >
                            Return to Sanctuary
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default function App() {
    const [stage, setStage] = useState('landing'); // landing, login, templates, dashboard
    const [userName, setUserName] = useState('');
    const [userAge, setUserAge] = useState('');
    const [userGender, setUserGender] = useState('Female');
    const [userPhone, setUserPhone] = useState('');
    const [showSafetyAlert, setShowSafetyAlert] = useState(false);
    const [persistentResources, setPersistentResources] = useState({
        breathing: "Calm your mind. Inhale for 4, hold for 4, exhale for 4.",
        music: "Lofi Beats - Chill Study Music",
        tip: "Take a deep breath and stay present."
    });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ labels: [], scores: [] });
    const [timeRange, setTimeRange] = useState('week');
    const [formData, setFormData] = useState(initialForm);
    const [botMessage, setBotMessage] = useState(null);
    const [audioPlayer, setAudioPlayer] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // Context-aware music mapping
    const MUSIC_TRACKS = {
        "Happy": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=uplifting-future-bass-26336.mp3",
        "Sad": "https://cdn.pixabay.com/download/audio/2022/03/24/audio_34b6845239.mp3?filename=sad-piano-22026.mp3",
        "Anxious": "https://cdn.pixabay.com/download/audio/2022/10/25/audio_121db91929.mp3?filename=meditative-rain-11961.mp3",
        "Stressed": "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=lofi-study-112778.mp3",
        "Focus": "https://cdn.pixabay.com/download/audio/2022/05/17/audio_32c9438096.mp3?filename=focus-soft-corporate-11075.mp3",
        "Calm": "https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=calm-acoustic-guitar-12497.mp3",
        "default": "https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=lofi-study-112778.mp3"
    };

    const toggleMusic = () => {
        if (isPlaying && audioPlayer) {
            audioPlayer.pause();
            setIsPlaying(false);
        } else {
            const moodKey = formData.overall_mood || "default";
            // Simple keyword matching for existing tracks if precise mood isn't found
            let streamUrl = MUSIC_TRACKS[moodKey] || MUSIC_TRACKS["default"];

            // Override based on specific text in persistentResources if possible (advanced)
            if (persistentResources.music.toLowerCase().includes("rain")) streamUrl = MUSIC_TRACKS["Anxious"];
            if (persistentResources.music.toLowerCase().includes("piano")) streamUrl = MUSIC_TRACKS["Sad"];

            if (audioPlayer) {
                audioPlayer.src = streamUrl;
                audioPlayer.play();
            } else {
                const newAudio = new Audio(streamUrl);
                newAudio.loop = true;
                newAudio.play();
                setAudioPlayer(newAudio);
            }
            setIsPlaying(true);
        }
    };

    useEffect(() => {
        if (stage === 'dashboard') {
            fetchEntries();
            fetchStats();
        }
    }, [stage, timeRange]);

    const fetchEntries = async () => {
        try {
            const res = await axios.get(`${API_BASE}/journal/entries`);
            setEntries(res.data);
            if (res.data && res.data.length > 0) {
                const latest = res.data[0];
                setPersistentResources({
                    breathing: latest.breathing_exercise || "Calm your mind. Inhale for 4, hold for 4, exhale for 4.",
                    music: latest.focus_music || "Lofi Beats - Chill Study Music",
                    tip: latest.counselor_info || "Take a deep breath and stay present."
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_BASE}/mood/stats?range=${timeRange}`);
            setStats(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveEntry = async () => {
        if (!formData.overall_mood || !formData.triggers) {
            alert("Please select your mood and describe the situation.");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...formData,
                user_age: parseInt(userAge) || 18,
                user_gender: userGender,
                user_phone: userPhone
            };
            const res = await axios.post(`${API_BASE}/journal/entries`, payload);

            // Parse JSON strings from backend
            const responseData = res.data;
            try {
                if (typeof responseData.counselor_tips === 'string') {
                    responseData.counselor_tips = JSON.parse(responseData.counselor_tips);
                }
            } catch (e) {
                console.error("Failed to parse tips", e);
                responseData.counselor_tips = [];
            }

            setBotMessage(responseData);
            if (res.data.is_critical) {
                setShowSafetyAlert(true);
            }
            setPersistentResources({
                breathing: res.data.breathing_exercise,
                music: res.data.focus_music,
                tip: res.data.counselor_info
            });
            speak(res.data.suggestion);
            setFormData(initialForm);
            fetchEntries();
            fetchStats();
        } catch (e) {
            console.error(e);
            alert("Failed to save entry. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    if (stage === 'landing') {
        return <LandingPage onEnter={() => setStage('login')} />;
    }

    if (stage === 'login') {
        return (
            <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
                <BeachBackground />
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 max-w-md w-full text-center space-y-8 relative z-10 backdrop-blur-xl border-white/50 border-2">
                    <div className="bg-white/40 p-5 rounded-3xl inline-block shadow-inner ring-1 ring-white/50">
                        <Heart className="text-rose-500 w-12 h-12 fill-rose-500 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Aura Console</h1>
                        <p className="text-slate-600 font-bold italic mt-2">Find your peace by the digital shore.</p>
                    </div>

                    <div className="space-y-4 text-left">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Your Identity</p>
                            <input
                                type="text"
                                placeholder="Full Name"
                                className="w-full p-5 rounded-3xl border-2 border-slate-200/50 bg-white/60 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-xs font-bold transition-all placeholder:text-slate-400"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="w-1/3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Age</p>
                                <input
                                    type="number"
                                    placeholder="Age"
                                    className="w-full p-5 rounded-3xl border-2 border-slate-200/50 bg-white/60 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 text-xs font-bold transition-all placeholder:text-slate-400"
                                    value={userAge}
                                    onChange={(e) => setUserAge(e.target.value)}
                                />
                            </div>
                            <div className="w-2/3">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Gender</p>
                                <select
                                    className="w-full p-5 rounded-3xl border-2 border-slate-200/50 bg-white/60 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-xs font-bold transition-all text-slate-700"
                                    value={userGender}
                                    onChange={(e) => setUserGender(e.target.value)}
                                >
                                    <option value="Female">Female</option>
                                    <option value="Male">Male</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Contact Number (For Safety)</p>
                            <input
                                type="tel"
                                placeholder="+91 00000 00000"
                                className="w-full p-5 rounded-3xl border-2 border-slate-200/50 bg-white/60 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-100 text-xs font-bold transition-all placeholder:text-slate-400"
                                value={userPhone}
                                onChange={(e) => setUserPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => userName && userAge && userPhone && setStage('templates')}
                        className="w-full bg-slate-800 text-white py-5 rounded-full font-black text-sm shadow-2xl hover:bg-slate-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:grayscale"
                        disabled={!userName || !userAge || !userPhone}
                    >
                        Begin Reflection
                    </button>

                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Safe • Private • Calming</p>
                </motion.div>
            </div>
        );
    }

    if (stage === 'templates') {
        return (
            <div className="min-h-screen relative p-8 md:p-16 overflow-hidden">
                <BeachBackground />
                <div className="max-w-6xl mx-auto space-y-12 relative z-10">
                    <div className="text-center space-y-4">
                        <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-black text-slate-800 tracking-tight">
                            Choose Your Sanctuary, {userName}
                        </motion.h2>
                        <p className="text-slate-600 font-bold text-sm italic">Select a template that matches your current energy.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {TEMPLATES.map((t, i) => (
                            <motion.div
                                key={t.name}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => {
                                    setSelectedTemplate(t);
                                    setShowTemplateModal(true);
                                }}
                                className="glass-card group p-8 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all border-2 border-white/50 backdrop-blur-xl relative overflow-hidden"
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-10 -mt-10 transition-colors group-hover:opacity-40
                                    ${t.theme === 'blue' ? 'bg-blue-400' :
                                        t.theme === 'teal' ? 'bg-teal-400' :
                                            t.theme === 'gold' ? 'bg-amber-400' :
                                                t.theme === 'indigo' ? 'bg-indigo-400' :
                                                    t.theme === 'slate' ? 'bg-slate-400' :
                                                        t.theme === 'sage' ? 'bg-emerald-400' :
                                                            t.theme === 'yellow' ? 'bg-yellow-400' :
                                                                t.theme === 'lavender' ? 'bg-purple-400' :
                                                                    t.theme === 'peach' ? 'bg-orange-400' : 'bg-slate-200'}
                                `} />
                                <div className="space-y-4 relative z-10">
                                    <div className="p-4 bg-white/50 rounded-2xl inline-block shadow-sm">
                                        {React.cloneElement(t.icon, { size: 32, className: "text-slate-700" })}
                                    </div>
                                    <h3 className="text-base font-black text-slate-800">{t.name}</h3>
                                    <p className="text-slate-600 font-medium leading-relaxed">{t.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {showTemplateModal && selectedTemplate && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className={`rounded-[40px] p-10 max-w-sm w-full shadow-2xl space-y-8 text-center border-4 border-white relative overflow-hidden bg-gradient-to-br ${selectedTemplate.theme === 'blue' ? 'from-blue-50 to-white' :
                                    selectedTemplate.theme === 'teal' ? 'from-teal-50 to-white' :
                                        selectedTemplate.theme === 'gold' ? 'from-amber-50 to-white' :
                                            selectedTemplate.theme === 'indigo' ? 'from-indigo-50 to-white' :
                                                selectedTemplate.theme === 'slate' ? 'from-slate-100 to-white' :
                                                    selectedTemplate.theme === 'sage' ? 'from-emerald-50 to-white' :
                                                        selectedTemplate.theme === 'yellow' ? 'from-yellow-50 to-white' :
                                                            selectedTemplate.theme === 'lavender' ? 'from-purple-50 to-white' :
                                                                selectedTemplate.theme === 'peach' ? 'from-orange-50 to-white' : 'from-slate-100 to-white'
                                    }`}
                            >
                                <div className={`absolute top-0 left-0 w-full h-3 ${selectedTemplate.theme === 'blue' ? 'bg-blue-500' :
                                    selectedTemplate.theme === 'teal' ? 'bg-teal-500' :
                                        selectedTemplate.theme === 'gold' ? 'bg-amber-500' :
                                            selectedTemplate.theme === 'indigo' ? 'bg-indigo-500' :
                                                selectedTemplate.theme === 'slate' ? 'bg-slate-500' :
                                                    selectedTemplate.theme === 'sage' ? 'bg-emerald-500' :
                                                        selectedTemplate.theme === 'yellow' ? 'bg-yellow-500' :
                                                            selectedTemplate.theme === 'lavender' ? 'bg-purple-500' :
                                                                selectedTemplate.theme === 'peach' ? 'bg-orange-500' : 'bg-slate-800'
                                    }`} />

                                <div className="space-y-4">
                                    <div className={`p-5 rounded-3xl inline-block shadow-lg ring-4 ring-white ${selectedTemplate.theme === 'minimal' ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'}`}>
                                        {React.cloneElement(selectedTemplate.icon, { size: 48 })}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedTemplate.name}</h3>
                                        <p className={`font-bold mt-2 text-sm italic ${selectedTemplate.theme === 'blue' ? 'text-blue-600' :
                                            selectedTemplate.theme === 'teal' ? 'text-teal-600' :
                                                selectedTemplate.theme === 'gold' ? 'text-amber-600' :
                                                    selectedTemplate.theme === 'indigo' ? 'text-indigo-600' :
                                                        selectedTemplate.theme === 'sage' ? 'text-emerald-600' :
                                                            selectedTemplate.theme === 'lavender' ? 'text-purple-600' : 'text-slate-500'
                                            }`}>{selectedTemplate.modalIntro}</p>
                                    </div>
                                </div>

                                <p className="text-slate-500 font-medium text-xs leading-relaxed px-4">{selectedTemplate.desc}</p>

                                <div className="space-y-3 pt-4">
                                    <button
                                        onClick={() => {
                                            setFormData({ ...formData, template_name: selectedTemplate.name });
                                            setStage('dashboard');
                                            setActiveTab('dashboard');
                                            setShowTemplateModal(false);
                                        }}
                                        className={`w-full py-4 text-white rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1 active:translate-y-0 ${selectedTemplate.btnColor || "bg-slate-800 hover:bg-slate-900"}`}
                                    >
                                        <MessageSquare size={20} /> Chat with AI
                                    </button>
                                    <button
                                        onClick={() => setShowTemplateModal(false)}
                                        className="w-full py-4 bg-white/50 text-slate-400 rounded-2xl font-bold hover:bg-white hover:text-rose-500 transition-all text-xs uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentTemplate = TEMPLATES.find(t => t.name === formData.template_name) || TEMPLATES[0];
    const themeColor = currentTemplate.theme;

    return (
        <div className="min-h-screen relative overflow-hidden">
            <BeachBackground />
            <AuraShieldAlert
                isOpen={showSafetyAlert}
                onClose={() => setShowSafetyAlert(false)}
                contacts={botMessage?.emergency_contacts || []}
            />

            {/* Main App Container */}
            <div className="flex flex-col md:flex-row relative z-10">
                {/* Responsive Navigation */}
                <nav className="w-full md:w-24 md:min-h-screen glass-card m-0 md:m-6 p-4 md:py-12 flex flex-row md:flex-col items-center justify-around md:justify-center gap-8 backdrop-blur-2xl border-white/60">
                    <div className="flex items-center gap-3 mb-0 md:mb-16 px-4">
                        <div className="bg-pink-50 p-2 rounded-xl">
                            <Heart className="text-pink-500 w-8 h-8 fill-pink-500" />
                        </div>
                        <span className="text-base font-black text-aura-darkBlue tracking-tight hidden lg:block">Aura</span>
                    </div>

                    <div className="flex md:flex-col gap-6 flex-1 justify-center md:justify-start w-full">
                        <NavIcon icon={<Home />} label="Home" active={stage === 'templates'} onClick={() => setStage('templates')} />
                        <NavIcon icon={<LineChart />} label="Analyze Mood" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setStage('dashboard'); }} />
                        <NavIcon active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<LineChart size={24} />} label="Stats" />
                        <NavIcon active={activeTab === 'help'} onClick={() => setActiveTab('help')} icon={<HelpCircle size={24} />} label="Help" />
                        <NavIcon active={activeTab === 'sanctuary'} onClick={() => setActiveTab('sanctuary')} icon={<Cloud size={24} />} label="Sanctuary" />
                        <NavIcon active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24} />} label="Settings" />
                    </div>

                    <div className="hidden lg:block p-6 mt-auto">
                        <div className="p-4 bg-aura-blue rounded-2xl space-y-2">
                            <p className="text-[9px] font-black text-aura-darkBlue uppercase">Active Template</p>
                            <p className="text-[10px] font-bold text-slate-700">{formData.template_name}</p>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-12 bg-aura-blue/30 overflow-y-auto">
                    <div className="max-w-4xl mx-auto pb-12">
                        <AnimatePresence mode="wait">
                            {activeTab === 'dashboard' && (
                                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                                    <header className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <h1 className="text-xl font-black text-aura-darkBlue leading-tight tracking-tight">Mood Analysis Interface</h1>
                                                <p className="text-slate-500 text-xs font-medium italic">Welcome Back, {userName}. Your {formData.template_name} guide is ready.</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="px-4 py-2 bg-white/60 rounded-2xl border border-white/80 shadow-sm">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gender</p>
                                                    <p className="text-[10px] font-bold text-aura-darkBlue">{userGender}</p>
                                                </div>
                                                <div className="px-4 py-2 bg-white/60 rounded-2xl border border-white/80 shadow-sm">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Age</p>
                                                    <p className="text-[10px] font-bold text-aura-darkBlue">{userAge}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <WebcamAnalyzer
                                            onMoodDetected={(mood) => setFormData({ ...formData, overall_mood: mood })}
                                            template={currentTemplate}
                                        />
                                    </header>

                                    {botMessage ? (
                                        <motion.section initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8">
                                            <div className={`glass-card p-10 space-y-6 journal-paper paper-texture ${currentTemplate.botBg || 'bg-white'}`}>
                                                <div className="flex gap-4 items-center mb-4 relative z-10">
                                                    <div className={`p-3 rounded-full shadow-md ${currentTemplate.botBubble || 'bg-green-100 text-green-600'}`}>
                                                        <Activity size={32} />
                                                    </div>
                                                    <div>
                                                        <h4 className={`text-base font-black ${currentTemplate.botAccent || 'text-aura-darkBlue'}`}>AI Bot: {botMessage.emotion}</h4>
                                                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Sanctuary: {currentTemplate.name}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4 relative z-10 pl-16">
                                                    {(botMessage.suggestion || "").split('\n').filter(p => p.trim()).map((paragraph, idx) => (
                                                        <p key={idx} className="text-xl font-medium text-slate-700 leading-relaxed" style={{ fontFamily: '"Indie Flower", cursive' }}>
                                                            {paragraph.trim()}
                                                        </p>
                                                    ))}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 relative z-10 pl-16">
                                                    <div className={`p-6 rounded-3xl space-y-3 shadow-sm border ${currentTemplate.botBubble || 'bg-blue-50 border-blue-100'}`}>
                                                        <Wind className={currentTemplate.botAccent || 'text-blue-500'} />
                                                        <h5 className="font-black text-aura-darkBlue">Breathing Exercise</h5>
                                                        <p className={`text-[10px] font-medium leading-relaxed ${currentTemplate.botAccent || 'text-blue-800'}`}>{botMessage.breathing_exercise}</p>
                                                    </div>
                                                    <div className={`p-6 rounded-3xl space-y-3 shadow-sm border ${currentTemplate.botBubble || 'bg-purple-50 border-purple-100'}`}>
                                                        <Music className={currentTemplate.botAccent || 'text-purple-500'} />
                                                        <h5 className="font-black text-aura-darkBlue">Focus Music</h5>
                                                        <p className={`text-[10px] font-medium leading-relaxed ${currentTemplate.botAccent || 'text-purple-800'}`}>{botMessage.focus_music}</p>
                                                    </div>
                                                    <div className={`p-6 rounded-3xl space-y-3 shadow-sm border ${currentTemplate.botBubble || 'bg-pink-50 border-pink-100'}`}>
                                                        <HelpCircle className={currentTemplate.botAccent || 'text-pink-500'} />
                                                        <h5 className="font-black text-aura-darkBlue">Support Info</h5>
                                                        <p className={`text-[10px] font-medium leading-relaxed ${currentTemplate.botAccent || 'text-pink-800'}`}>{botMessage.counselor_info}</p>
                                                    </div>
                                                </div>

                                                {botMessage.counselor_tips && botMessage.counselor_tips.length > 0 && (
                                                    <div className="pt-6 space-y-4 relative z-10 pl-16">
                                                        <h5 className="text-xs font-black text-aura-darkBlue flex items-center gap-2">
                                                            <Activity className="text-aura-darkBlue" size={20} /> counselor's Daily Tips
                                                        </h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            {(botMessage.counselor_tips || []).map((tip, i) => (
                                                                <div key={i} className={`p-4 bg-white/80 border-2 rounded-2xl text-[12px] font-bold shadow-sm italic ring-1 ${currentTemplate.botBubble || 'border-slate-50 text-slate-600 ring-blue-50'}`} style={{ fontFamily: '"Indie Flower", cursive' }}>
                                                                    "{tip}"
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="pl-16 relative z-10">
                                                    <button
                                                        onClick={() => setBotMessage(null)}
                                                        className="w-full mt-6 py-4 bg-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-200 transition-colors"
                                                    >
                                                        Close My Journal
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.section>
                                    ) : (
                                        <section className="glass-card p-10 space-y-10 journal-paper paper-texture bg-white">
                                            <div className="space-y-6 relative z-10 pl-16">
                                                <div className="flex gap-4 items-center">
                                                    <div className={`p-3 rounded-full shadow-inner ${currentTemplate.botBubble || 'bg-aura-blue text-aura-darkBlue'}`}>
                                                        <Activity size={24} />
                                                    </div>
                                                    <label className={`block text-xl font-black tracking-tight ${currentTemplate.botAccent || 'text-slate-800'}`}>
                                                        {currentTemplate.botGreet || `How are you feeling within the "${formData.template_name}" sanctuary?`}
                                                    </label>
                                                </div>
                                                <div className="flex flex-wrap gap-4">
                                                    {(currentTemplate.moodOptions || ['Happy', 'Calm', 'Anxious', 'Sad', 'Stressed', 'Focused']).map(mood => (
                                                        <button
                                                            key={mood}
                                                            onClick={() => setFormData({ ...formData, overall_mood: mood })}
                                                            className={`px-8 py-3 rounded-full border-2 transition-all font-bold ${formData.overall_mood === mood ? `${currentTemplate.btnColor || 'bg-aura-darkBlue'} text-white border-transparent shadow-lg` : `bg-white/80 text-slate-500 border-slate-100 hover:border-blue-200 shadow-sm`}`}
                                                        >
                                                            {mood}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3 relative z-10 pl-16">
                                                <label className="block text-sm font-black text-slate-800 uppercase tracking-widest">Share with your Aura Bot</label>
                                                <textarea
                                                    className="w-full p-8 rounded-[32px] border-2 border-slate-100 bg-white/80 outline-none focus:ring-8 focus:ring-blue-50 transition-all min-h-[250px] text-lg leading-relaxed shadow-inner"
                                                    style={{ fontFamily: '"Indie Flower", cursive' }}
                                                    placeholder="Pour your thoughts onto the page..."
                                                    value={formData.triggers}
                                                    onChange={(e) => setFormData({ ...formData, triggers: e.target.value })}
                                                />
                                            </div>

                                            <div className="flex justify-end pt-8 relative z-10 pl-16">
                                                <button
                                                    onClick={handleSaveEntry}
                                                    disabled={loading}
                                                    className={`${currentTemplate.btnColor || 'bg-aura-darkBlue'} text-white px-20 py-6 rounded-full font-black text-lg hover:opacity-90 transition-all shadow-2xl disabled:opacity-50 ring-8 ring-white`}
                                                >
                                                    {loading ? 'Bot is Reading...' : 'Finalize Entry & Chat'}
                                                </button>
                                            </div>
                                        </section>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'stats' && (
                                <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                        <header className="space-y-2">
                                            <h2 className="text-xl font-black text-aura-darkBlue tracking-tight">Emotional Waves</h2>
                                            <p className="text-slate-500 font-medium italic">Mood patterns across time.</p>
                                        </header>
                                        <div className="flex bg-white p-2 rounded-2xl shadow-md border border-slate-100">
                                            {['day', 'week', 'month'].map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setTimeRange(r)}
                                                    className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${timeRange === r ? 'bg-aura-darkBlue text-white shadow-lg' : 'text-slate-400 hover:text-aura-darkBlue'}`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="glass-card p-12 h-[500px] bg-white">
                                        {stats.labels.length > 0 ? (
                                            <Line
                                                data={{
                                                    labels: stats.labels,
                                                    datasets: [{
                                                        label: 'Mood Score',
                                                        data: stats.scores,
                                                        borderColor: '#1E3A8A',
                                                        tension: 0.4,
                                                        fill: true,
                                                        backgroundColor: 'rgba(30, 58, 138, 0.05)',
                                                        borderWidth: 6,
                                                        pointRadius: 6,
                                                    }]
                                                }}
                                                options={{
                                                    maintainAspectRatio: false,
                                                    scales: {
                                                        y: { min: -1, max: 1, ticks: { callback: (v) => v === 1 ? '😊' : v === 0 ? '😐' : v === -1 ? '😢' : '' } }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                                <LineChart size={64} />
                                                <p className="text-sm font-black">No waves detected for this period.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'sanctuary' && (
                                <motion.div key="sanctuary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                                    <header className="space-y-2">
                                        <h2 className="text-xl font-black text-aura-darkBlue tracking-tight flex items-center gap-4">
                                            <Cloud className="text-blue-400" size={40} /> The Sanctuary
                                        </h2>
                                        <p className="text-slate-500 font-medium italic">Your persistent space for deep breathing and focus music.</p>
                                    </header>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="glass-card p-10 bg-gradient-to-br from-blue-50 to-white border-blue-100 border-2 space-y-6">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="p-4 bg-blue-500 text-white rounded-2xl shadow-lg">
                                                    <Wind size={32} />
                                                </div>
                                                <h3 className="text-base font-black text-slate-800">Breath of Life</h3>
                                            </div>
                                            <p className="text-xs font-medium text-blue-900 leading-relaxed bg-white/50 p-6 rounded-[32px] border border-blue-100 shadow-inner">
                                                "{persistentResources.breathing}"
                                            </p>
                                            <div className="flex gap-4">
                                                <button onClick={() => speak(persistentResources.breathing)} className="flex-1 py-4 bg-blue-100 text-blue-700 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-200 transition-all">
                                                    <Volume2 size={20} /> Listen to Guide
                                                </button>
                                            </div>
                                        </div>

                                        <div className="glass-card p-10 bg-gradient-to-br from-purple-50 to-white border-purple-100 border-2 space-y-6">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="p-4 bg-purple-500 text-white rounded-2xl shadow-lg">
                                                    <Music size={32} />
                                                </div>
                                                <h3 className="text-base font-black text-slate-800">Aura Radio</h3>
                                            </div>
                                            <div className="p-6 bg-white/50 rounded-[32px] border border-purple-100 shadow-inner space-y-4">
                                                <p className="text-xs font-bold text-purple-900">{persistentResources.music}</p>
                                                <div className="h-2 w-full bg-purple-100 rounded-full overflow-hidden">
                                                    {isPlaying && (
                                                        <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="h-full w-1/3 bg-purple-500 rounded-full" />
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={toggleMusic}
                                                className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all ${isPlaying ? 'bg-purple-100 text-purple-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                            >
                                                {isPlaying ? 'Pause Focus Player' : 'Play Focus Player'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="glass-card p-10 bg-orange-50/50 border-orange-100 border-2 flex items-center gap-8">
                                        <div className="p-5 bg-orange-100 text-orange-600 rounded-3xl shrink-0">
                                            <Coffee size={40} />
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-black text-orange-900 italic">Daily Soul Tip</h4>
                                            <p className="text-xs font-medium text-orange-800 leading-relaxed">"{persistentResources.tip}"</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'help' && (
                                <motion.div key="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="glass-card p-10 space-y-8">
                                        <h2 className="text-lg font-black text-aura-darkBlue">Support Resources</h2>
                                        <div className="space-y-6">
                                            <SupportContact title="Vandrevala Foundation" number="9999 666 555" />
                                            <SupportContact title="iCall (TISS)" number="022-25521111" />
                                        </div>
                                        <div className="p-4 bg-red-50 rounded-xl text-red-700 text-[10px] font-bold italic border-l-4 border-red-500">
                                            In case of immediate danger, please contact local emergency services.
                                        </div>
                                    </div>
                                    <div className="glass-card p-10 bg-aura-darkBlue text-white space-y-6">
                                        <h2 className="text-lg font-black">Find Help Nearby</h2>
                                        <p className="text-blue-100 font-medium">Use our locator to find professional clinics and counselors in your area.</p>
                                        <iframe
                                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.3123846618116!2d77.59160531536465!3d12.97159891845112!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670cdc9b251%3A0xc3f7a14ec866cf32!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1676371200000!5m2!1sen!2sin"
                                            className="w-full h-64 rounded-2xl opacity-80"
                                            loading="lazy"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'settings' && (
                                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-12">
                                    <header className="space-y-2">
                                        <h2 className="text-xl font-black text-aura-darkBlue">Settings</h2>
                                        <p className="text-slate-500 font-medium italic">Manage your profile and data.</p>
                                    </header>
                                    <div className="glass-card p-10 space-y-8">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800">User Profile</h4>
                                                <p className="text-[10px] text-slate-400 font-medium">{userName}</p>
                                            </div>
                                            <button onClick={() => setStage('login')} className="bg-slate-50 px-6 py-2 rounded-xl text-aura-darkBlue font-black text-[9px] hover:bg-slate-100">Switch User</button>
                                        </div>
                                        <button onClick={() => setStage('templates')} className="w-full bg-blue-50 py-4 rounded-2xl text-aura-darkBlue font-black text-[10px] hover:bg-blue-100">Change Active Template</button>
                                        <div className="pt-8 border-t border-slate-100">
                                            <h4 className="text-sm font-black text-red-600 mb-4">Danger Zone</h4>
                                            <button onClick={async () => {
                                                if (confirm("Erase all data?")) {
                                                    await axios.delete(`${API_BASE}/data/clear`);
                                                    setEntries([]);
                                                    setStats({ labels: [], scores: [] });
                                                }
                                            }} className="text-red-600 font-bold hover:underline">Delete all history</button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}

function NavIcon({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col lg:flex-row items-center gap-4 w-full p-4 rounded-3xl transition-all relative overflow-hidden group ${active ? 'bg-aura-blue text-aura-darkBlue' : 'text-slate-300 hover:bg-aura-lavender hover:text-aura-darkBlue'}`}
        >
            <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
                {React.cloneElement(icon, { size: active ? 28 : 24 })}
            </div>
            {label && <span className="text-[9px] lg:text-xs font-black hidden md:block">{label}</span>}
            {active && <div className="absolute left-0 w-1.5 h-full bg-aura-darkBlue rounded-r-full hidden lg:block" />}
        </button>
    );
}

function SupportContact({ title, number }) {
    return (
        <div className="p-6 bg-slate-50 rounded-2xl flex justify-between items-center">
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                <p className="text-base font-black text-aura-darkBlue">{number}</p>
            </div>
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-aura-darkBlue">
                <Heart size={24} />
            </div>
        </div>
    );
}
