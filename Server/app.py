import os
import secrets
from flask import Flask, request, jsonify, session, send_file, send_from_directory
from flask_session import Session
from datetime import timedelta
import logging

# Import our modules
from ai.granite_client import generate_story_content
from utils.validators import validate_story_input
from utils.response_cleaner import clean_ai_response
from exports.pdf_export import generate_pdf
from exports.docx_export import generate_docx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
# We assume the client folder is one level up, in 'client'
client_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '../client'))
app = Flask(__name__, static_folder=client_folder, static_url_path='')

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
    # Check if index.html exists in client folder
    index_path = os.path.join(client_folder, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(client_folder, 'index.html')
    return "Client interface not found. Please ensure 'client/index.html' exists.", 404

@app.route('/set-username', methods=['POST'])
def set_username():
    """Stores username in session."""
    data = request.json
    username = data.get('username')
    if not username:
        return jsonify({"error": "Username is required"}), 400
    
    session['username'] = username
    return jsonify({"message": "Username set successfully", "username": username})

@app.route('/generate-content', methods=['POST'])
def generate_content():
    """
    Main endpoint to generate Screenplay, Characters, and Sound Design.
    """
    # 1. Validation
    data = request.json
    is_valid, error = validate_story_input(data)
    if not is_valid:
        return jsonify({"error": error}), 400

    story = data.get('story')
    genre = data.get('genre', 'Drama')
    scene_count = data.get('scene_count', '3-5')

    # 2. Check for existing generation? (Optional, but user said "Prevent re-generation on navigation")
    # For now, we always generate if requested explicitly.

    # 3. Call AI
    try:
        results = generate_story_content(story, genre, scene_count)
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return jsonify({"error": "Internal AI generation error"}), 500

    if results['meta']['status'] != 'success' and results['meta']['status'] != 'partial_success':
         return jsonify({"error": "Failed to generate content from AI model."}), 500

    # 4. Clean Output
    cleaned_screenplay = clean_ai_response(results['screenplay'])
    cleaned_characters = clean_ai_response(results['characters'])
    cleaned_sound = clean_ai_response(results['sound_design'])

    # 5. Store in Session
    session['generated_content'] = {
        "screenplay": cleaned_screenplay,
        "characters": cleaned_characters,
        "sound_design": cleaned_sound,
        "meta": results['meta']
    }

    # 6. Return JSON
    return jsonify({
        "screenplay": cleaned_screenplay,
        "characters": cleaned_characters,
        "sound_design": cleaned_sound,
        "meta": results['meta']
    })

@app.route('/download/<format_type>', methods=['POST'])
def download_content(format_type):
    """
    Endpoint to download generated content in specific formats.
    """
    content = session.get('generated_content')
    if not content:
        return jsonify({"error": "No content generated yet."}), 404
    
    if format_type == 'txt':
        # Text export logic (simple string concatenation)
        full_text = f"SCREENPLAY\n\n{content['screenplay']}\n\n" \
                    f"CHARACTERS\n\n{content['characters']}\n\n" \
                    f"SOUND DESIGN\n\n{content['sound_design']}"
        
        # Create a temporary file or specific response
        # Using send_file with BytesIO is better but for text we can return plain response or file
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
            logger.error(f"PDF generation failed: {e}")
            return jsonify({"error": "PDF generation failed"}), 500

    elif format_type == 'docx':
        try:
            docx_buffer = generate_docx(content)
            return send_file(docx_buffer, as_attachment=True, download_name="scriptoria_export.docx", mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        except Exception as e:
            logger.error(f"DOCX generation failed: {e}")
            return jsonify({"error": "DOCX generation failed"}), 500

    else:
        return jsonify({"error": "Invalid format requested"}), 400

if __name__ == '__main__':
    # Run server
    # Host 0.0.0.0 for external access if needed, or localhost
    app.run(host='0.0.0.0', port=5000, debug=True)
