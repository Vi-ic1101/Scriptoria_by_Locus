# DRAFTROOM
### *Where Algorithms Meet Artistry*

**DraftRoom** (formerly Scriptoria) is a premium AI-powered creative studio designed for screenwriters and filmmakers. It leverages local Large Language Models (LLMs) and neural audio synthesis to transform simple story concepts into production-ready screenplays, complete with character breakdowns, sound design cues, voice-over narration, and original musical scores.

![DraftRoom Studio](https://via.placeholder.com/800x400?text=DraftRoom+UI+Placeholder)

---

## 🎬 Features

### 1. **AI Screenwriter**
   - **Engine**: Powered by **Ollama** running `granite4:micro` (optimized for creative text).
   - **Capabilities**: Generates industry-standard screenplays (Scene, Action, Character, Dialogue) from a single prompt.
   - **Customization**: Select Genre (Noir, Sci-Fi, Drama) and Scene Count (Short, Standard, Extended).

### 2. **Asset Generation**
   - **Character Profiles**: Automatically extracts cast lists with detailed descriptions and motivations.
   - **Sound Design**: Generates a dedicated sound cue sheet for audio engineers.
   - **Synopsis**: Creates a compelling logline and summary of the generated script.

### 3. **Audio Studio**
   - **Cinematic Narration**: Converts the screenplay into a full audio drama using **Microsoft Edge Neural TTS** (Voice: *Christopher*).
   - **AI Composer**:
     - **Cloud Mode**: Connects to Hugging Face Inference API (`facebook/musicgen-small`) for high-fidelity music generation.
     - **Acoustic Fallback**: Uses a local **Karplus-Strong synthesis algorithm** to generate mood-based ambient scores (Happy, Sad, Tense, Scary) without internet or GPU dependency.

### 4. **Professional Export**
   - **PDF**: Industry-standard formatting suitable for printing and sharing.
   - **DOCX**: Editable Word documents for further refinement.
   - **Shareable Links**: Generate temporary read-only links for collaboration.

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask, Flask-Session (Filesystem)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (No heavy frameworks, pure performance)
- **AI Core**:
  - [Ollama](https://ollama.com/) (Local Text Inference)
  - [Edge-TTS](https://github.com/rany2/edge-tts) (Neural Speech)
  - [Hugging Face](https://huggingface.co/) (MusicGen)
- **Utilities**: `reportlab` (PDF), `python-docx` (Word), `scipy` (Audio Processing)

---

## 🚀 Installation

### Prerequisites
1.  **Python 3.8+** installed.
2.  **[Ollama](https://ollama.com/download)** installed and running.

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/draftroom.git
cd draftroom
```

### 2. Setup AI Model
Pull the optimized Granite model for local inference:
```bash
ollama pull granite4:micro
```
*Ensure Ollama is running in the background (`ollama serve`).*

### 3. Install Dependencies
Navigate to the server directory and install Python packages:
```bash
cd server
pip install -r requirements.txt
```

### 4. (Optional) Configure Environment
Create a `.env` file in `server/` if you want to use the Cloud Music Generator:
```ini
HF_TOKEN=your_huggingface_write_token
```
*If skipped, the system will seamlessly fallback to local acoustic synthesis.*

---

## ⚡ Usage

### Start the Server
From the `server` directory:
```bash
python app.py
```
*The server will start at `http://localhost:5000`.*

### Enter the Studio
1.  Open your browser and navigate to **[http://localhost:5000](http://localhost:5000)**.
2.  **Phase 1: Conceptualization**:
    -   Select Genre, Language, and Length.
    -   Enter a story idea (e.g., *"A detective discovers his reflection is missing during a rainstorm"*).
    -   Click **ACTION**.
3.  **Phase 2: Production**:
    -   Read the generated Screenplay.
    -   Explore Character and Sound tabs.
    -   Click **🎵 COMPOSER** to generate a score.
    -   Click **🎙️ VO** to hear the script narrated.
    -   Export your work as PDF or DOCX.

---

## 📂 Project Structure

```
DraftRoom/
├── Client/                 # Frontend (Static)
│   ├── index.html          # Main Interface
│   ├── style.css           # Cinematic Styling
│   └── script.js           # UI Logic & API Calls
│
├── Server/                 # Backend (Flask)
│   ├── app.py              # Main Application Entry
│   ├── ai/                 # AI Modules
│   │   ├── granite_client.py   # Text Gen (Ollama)
│   │   └── music_generator.py  # Music Gen (Hybrid)
│   ├── exports/            # Document Generation (PDF/DOCX)
│   └── utils/              # Validators, TTS, Cleaning tools
│
└── requirements.txt        # Python Dependencies
```

---

*DraftRoom: Where imagination gets the green light.*
