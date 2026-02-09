# Scriptoria_by_Locus Backend

The backend for Scriptoria_by_Locus, an AI-powered screenplay generator.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Ollama Setup**:
    -   Ensure Ollama is installed and running (`ollama serve`).
    -   Pull the required model:
        ```bash
        ollama pull granite4:micro
        ```
    -   Verify Ollama is reachable at `http://localhost:11434`.

## Running the Server

1.  Navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Run the Flask app:
    ```bash
    python app.py
    ```
3.  The server will start at `http://localhost:5000`.

## API Endpoints

-   `GET /`: Serves the frontend (expects `../client/index.html`).
-   `POST /set-username`: Sets the username for the session.
-   `POST /generate-content`: Generates Screenplay, Characters, and Sound Design.
    -   Body: `{"story": "...", "genre": "...", "scene_count": "..."}`
-   `POST /download/<format>`: Downloads the generated content.
    -   Format: `txt`, `pdf`, `docx`.

## Testing

Run the unit tests:
```bash
python -m unittest tests/test_backend.py
```
