import os
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
from utils.ocr_handler import extract_text_from_image

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

@app.route('/generate-content', methods=['POST'])
def generate_content():
    """Main endpoint to generate Screenplay, Characters, and Sound Design."""
    data = request.json
    is_valid, error = validate_story_input(data)
    if not is_valid:
        return jsonify({"error": error}), 400

    story = data.get('story')
    genre = data.get('genre', 'Drama')
    scene_count = data.get('scene_count', '3-5')
    language = data.get('language', 'English')

    try:
        results = generate_story_content(story, genre, scene_count, language)
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return jsonify({"error": "Internal AI generation error"}), 500

    if results['meta']['status'] not in ['success', 'partial_success']:
         return jsonify({"error": "Failed to generate content from AI model."}), 500

    # Clean Output
    cleaned_screenplay = clean_ai_response(results['screenplay'])
    cleaned_characters = clean_ai_response(results['characters'])
    cleaned_sound = clean_ai_response(results['sound_design'])
    cleaned_synopsis = clean_ai_response(results.get('synopsis', ''))

    # Store in Session
    content_data = {
        "screenplay": cleaned_screenplay,
        "characters": cleaned_characters,
        "sound_design": cleaned_sound,
        "synopsis": cleaned_synopsis,
        "meta": results['meta']
    }
    session['generated_content'] = content_data
    
    # Store in Shared Memory (Lazy cleanup)
    share_id = str(uuid.uuid4())
    SHARED_SCRIPTS[share_id] = {
        "content": content_data,
        "created_at": datetime.now()
    }

    # Lazy Cleanup (remove entries older than 30 mins)
    now = datetime.now()
    expired_keys = [k for k, v in SHARED_SCRIPTS.items() if (now - v['created_at']) > timedelta(minutes=30)]
    for k in expired_keys:
        del SHARED_SCRIPTS[k]

    return jsonify({
        **content_data,
        "share_id": share_id
    })

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

@app.route('/upload-image', methods=['POST'])
def upload_image():
    """Extracts text from uploaded image."""
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    try:
        # Read file into memory
        image_bytes = file.read()
        text = extract_text_from_image(image_bytes)
        
        if not text:
             return jsonify({"error": "Could not extract text from image."}), 422

        return jsonify({"extracted_text": text})
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return jsonify({"error": str(e)}), 500

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
        return send_file(buffer, as_attachment=True, download_name="scriptoria_export.txt", mimetype="text/plain")

    elif format_type == 'pdf':
        try:
            pdf_buffer = generate_pdf(content)
            return send_file(pdf_buffer, as_attachment=True, download_name="scriptoria_export.pdf", mimetype="application/pdf")
        except Exception as e:
            return jsonify({"error": "PDF generation failed"}), 500

    elif format_type == 'docx':
        try:
            docx_buffer = generate_docx(content)
            return send_file(docx_buffer, as_attachment=True, download_name="scriptoria_export.docx", mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        except Exception as e:
            return jsonify({"error": "DOCX generation failed"}), 500

    else:
        return jsonify({"error": "Invalid format requested"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
