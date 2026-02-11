import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env
import secrets
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, session, send_file, send_from_directory, render_template
from flask_session import Session
from datetime import timedelta
import logging

# Import our modules
from ai.granite_client import generate_story_content
from utils.validators import validate_story_input
from utils.response_cleaner import clean_ai_response
from exports.pdf_export import generate_pdf
from exports.docx_export import generate_docx
from utils.tts_handler import text_to_speech
from ai.music_generator import generate_music

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
client_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '../client'))
template_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
app = Flask(__name__, static_folder=client_folder, static_url_path='', template_folder=template_folder)

# In-Memory Storage for Shared Scripts
SHARED_SCRIPTS = {}

# Configuration
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=1)
# Ensure session directory exists
session_dir = os.path.join(os.path.dirname(__file__), 'flask_session')
if not os.path.exists(session_dir):
    os.makedirs(session_dir)
app.config['SESSION_FILE_DIR'] = session_dir

# Initialize Session
Session(app)

@app.route('/')
def index():
    """Serve the frontend entry point."""
    index_path = os.path.join(client_folder, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(client_folder, 'index.html')
    return "Client interface not found. Please ensure 'client/index.html' exists.", 404

@app.route('/set-username', methods=['POST'])
def set_username():
    """Stores username in session."""
    data = request.json
    username = data.get('username')
    session['username'] = username
    return jsonify({"message": "Username set successfully"})

import threading
import time

# ... imports ...

# In-Memory Storage
SHARED_SCRIPTS = {}
JOBS = {}  # {job_id: {'status': 'pending'|'processing'|'completed'|'failed', 'results': ..., 'step': 'Starting...'}}

# ... config ...

def process_generation_job(job_id, data):
    """Background task to run AI generation."""
    logger.info(f"Starting job {job_id}")
    JOBS[job_id]['status'] = 'processing'
    JOBS[job_id]['step'] = 'Initializing AI Models...'
    
    story = data.get('story')
    genre = data.get('genre', 'Drama')
    scene_count = data.get('scene_count', '3-5')
    language = data.get('language', 'English')
    
    try:
        # We can update 'step' inside generate_story_content if we passed a callback, 
        # but for now we'll just let it run.
        # Ideally, breaking generate_story_content into steps would allow finer progress updates.
        
        # Simulating steps for the user if we can't hook into the deep function easily yet,
        # or we rely on the frontend cycling text. 
        # But let's try to update step if possible or just stick to 'processing'.
        
        results = generate_story_content(story, genre, scene_count, language)
        
        if results['meta']['status'] not in ['success', 'partial_success']:
             JOBS[job_id]['status'] = 'failed'
             JOBS[job_id]['error'] = "AI Model returned failure status."
             return

        # Clean Output
        cleaned_screenplay = clean_ai_response(results['screenplay'])
        cleaned_characters = clean_ai_response(results['characters'])
        cleaned_sound = clean_ai_response(results['sound_design'])
        cleaned_synopsis = clean_ai_response(results.get('synopsis', ''))

        content_data = {
            "screenplay": cleaned_screenplay,
            "characters": cleaned_characters,
            "sound_design": cleaned_sound,
            "synopsis": cleaned_synopsis,
            "meta": results['meta']
        }
        
        # Store Result
        JOBS[job_id]['results'] = content_data
        JOBS[job_id]['status'] = 'completed'
        logger.info(f"Job {job_id} completed successfully.")
        
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        JOBS[job_id]['status'] = 'failed'
        JOBS[job_id]['error'] = str(e)

@app.route('/generate-content', methods=['POST'])
def generate_content():
    """Initiates async generation."""
    data = request.json
    is_valid, error = validate_story_input(data)
    if not is_valid:
        return jsonify({"error": error}), 400

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        'status': 'pending',
        'created_at': datetime.now(),
        'step': 'Queued'
    }
    
    # Spawn Thread
    thread = threading.Thread(target=process_generation_job, args=(job_id, data))
    thread.daemon = True # Daemon threads exit when app exits
    thread.start()

    return jsonify({"job_id": job_id, "status": "pending"})

@app.route('/generation-status/<job_id>', methods=['GET'])
def get_generation_status(job_id):
    """Check status of a job."""
    job = JOBS.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    
    response = {
        "status": job['status'],
        "step": job.get('step', 'Processing...')
    }
    
    if job['status'] == 'completed':
        # Result is ready, client should fetch it or we send it here?
        # Sending it here is easier for now to avoid another call, 
        # but standard pattern often is status -> then fetch result.
        # Let's send result here to keep it simple for the frontend transition.
        
        # Also save to session to maintain compatibility with other endpoints (narrate/download)
        session['generated_content'] = job['results']
        
        # Also Shared memory logic
        share_id = str(uuid.uuid4())
        SHARED_SCRIPTS[share_id] = {
            "content": job['results'],
            "created_at": datetime.now()
        }
        
        response['data'] = job['results']
        response['share_id'] = share_id
        
        # Auto-cleanup job to save memory? 
        # Maybe keep it for a bit in case of retries, but session is set now.
        del JOBS[job_id] 
        
    elif job['status'] == 'failed':
        response['error'] = job.get('error', 'Unknown error')
        del JOBS[job_id]
        
    return jsonify(response)


@app.route('/share/<share_id>')
def view_shared_script(share_id):
    """Read-only view for shared scripts."""
    entry = SHARED_SCRIPTS.get(share_id)
    if not entry:
        return "<h1>Link Expired or Invalid</h1><p>Shared scripts are only available for 30 minutes.</p>", 404
    
    # Check expiry again just in case
    if (datetime.now() - entry['created_at']) > timedelta(minutes=30):
        del SHARED_SCRIPTS[share_id]
        return "<h1>Link Expired</h1>", 404

    return render_template('share_view.html', script_content=entry['content'])

@app.route('/narrate', methods=['POST'])
def narrate_content():
    """Generates audio from screenplay/synopsis."""
    if 'generated_content' not in session:
        return jsonify({"error": "No content to narrate"}), 404

    data = request.json
    narrate_type = data.get('type', 'screenplay') # 'screenplay' or 'synopsis'
    
    content = session['generated_content']
    text_to_read = ""
    
    if narrate_type == 'synopsis':
        text_to_read = content.get('synopsis', '')
    else:
        text_to_read = content.get('screenplay', '')

    if not text_to_read:
        return jsonify({"error": "No text found for selected type"}), 404

    # Remove strict formatting for better speech?
    # For now, read as is.
    
    output_dir = os.path.join(app.root_path, 'temp_audio')
    try:
        audio_path = text_to_speech(text_to_read, output_dir)
        if not audio_path:
             return jsonify({"error": "TTS failed"}), 500
        
        filename = os.path.basename(audio_path)
        return jsonify({"audio_url": f"/audio/{filename}"})
    except Exception as e:
        logger.error(f"Narration error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/audio/<filename>')
def serve_audio(filename):
    """
    Serves generated audio files.
    """
    audio_dir = os.path.join(app.root_path, 'temp_audio')
    return send_from_directory(audio_dir, filename)

@app.route('/generate-music', methods=['POST'])
def generate_music_route():
    """Generates music from description."""
    data = request.json
    description = data.get('description', '')
    
    if not description:
        return jsonify({"error": "No description provided"}), 400

    output_dir = os.path.join(app.root_path, 'temp_music')
    try:
        music_path = generate_music(description, duration=10, output_dir=output_dir)
        if not music_path:
             return jsonify({"error": "Music generation failed"}), 500
        
        filename = os.path.basename(music_path)
        return jsonify({"audio_url": f"/music/{filename}"})
    except Exception as e:
        logger.error(f"Music Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/music/<filename>')
def serve_music(filename):
    """
    Serves generated music files.
    """
    music_dir = os.path.join(app.root_path, 'temp_music')
    return send_from_directory(music_dir, filename)

@app.route('/download/<format_type>', methods=['GET'])
def download_content(format_type):
    """Endpoint to download generated content."""
    content = session.get('generated_content')
    if not content:
        return jsonify({"error": "No content generated yet."}), 404
    
    if format_type == 'txt':
        full_text = f"SCREENPLAY\n\n{content['screenplay']}\n\nCHARACTERS\n\n{content['characters']}\n\nSOUND DESIGN\n\n{content['sound_design']}"
        from io import BytesIO
        buffer = BytesIO()
        buffer.write(full_text.encode('utf-8'))
        buffer.seek(0)
        return send_file(buffer, as_attachment=True, download_name="draftroom_export.txt", mimetype="text/plain")

    elif format_type == 'pdf':
        try:
            pdf_buffer = generate_pdf(content)
            return send_file(pdf_buffer, as_attachment=True, download_name="draftroom_export.pdf", mimetype="application/pdf")
        except Exception as e:
            return jsonify({"error": "PDF generation failed"}), 500

    elif format_type == 'docx':
        try:
            docx_buffer = generate_docx(content)
            return send_file(docx_buffer, as_attachment=True, download_name="draftroom_export.docx", mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        except Exception as e:
            return jsonify({"error": "DOCX generation failed"}), 500

    else:
        return jsonify({"error": "Invalid format requested"}), 400

@app.route('/followup-questions', methods=['GET'])
def get_followup_questions():
    """Generates follow-up questions for the current script."""
    content = session.get('generated_content')
    if not content or not content.get('screenplay'):
        return jsonify({"error": "No screenplay found. Please generate one first."}), 400

    from ai.granite_client import generate_followup_questions
    
    try:
        questions = generate_followup_questions(content['screenplay'])
        # Store in session for validation later
        session['followup_questions'] = questions
        return jsonify({"questions": questions})
    except Exception as e:
        logger.error(f"Follow-up Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/improve-script', methods=['POST'])
def improve_script_route():
    """Improves the script based on user answers."""
    data = request.json
    answers = data.get('answers') # Expecting dict: {question_text: user_answer}
    
    if not answers:
        return jsonify({"error": "No answers provided"}), 400
        
    content = session.get('generated_content')
    if not content or not content.get('screenplay'):
         return jsonify({"error": "Original screenplay missing."}), 400

    from ai.granite_client import improve_screenplay
    
    try:
        updated_screenplay = improve_screenplay(content['screenplay'], answers)
        
        if updated_screenplay:
            # Update session
            content['screenplay'] = clean_ai_response(updated_screenplay)
            session['generated_content'] = content
            
            # Update shared version if exists (optional but good for consistency)
            # This is tricky without share_id being passed, but for now we update session.
            
            return jsonify({
                "screenplay": content['screenplay'],
                "message": "Screenplay improved successfully!"
            })
        else:
             return jsonify({"error": "AI failed to improve script"}), 500
             
    except Exception as e:
        logger.error(f"Improvement Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
