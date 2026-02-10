import requests
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "granite4:micro"

def query_ollama(prompt):
    """
    Sends a prompt to the local Ollama instance and returns the generated text.
    Retries or handles errors gracefully.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "num_predict": 8192
        }
    }

    try:
        logger.info(f"Sending request to Ollama ({MODEL_NAME})...")
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        
        data = response.json()
        return data.get("response", "")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama request failed: {e}")
        return None  # Or raise custom exception

def generate_story_content(story_idea, genre="Drama", scene_count="3-5", language="English"):
    """
    Orchestrates the generation of Screenplay, Characters, and Sound Design.
    Returns a dictionary with the results.
    """
    from .prompts import SCREENPLAY_PROMPT, CHARACTERS_PROMPT, SOUND_DESIGN_PROMPT, SYNOPSIS_PROMPT

    results = {
        "screenplay": None,
        "synopsis": None,
        "characters": None,
        "sound_design": None,
        "meta": {
            "model": MODEL_NAME,
            "status": "pending"
        }
    }

    # Format prompts
    p_screenplay = SCREENPLAY_PROMPT.format(story=story_idea, genre=genre, scene_count=scene_count, language=language)
    p_characters = CHARACTERS_PROMPT.format(story=story_idea, genre=genre, language=language)
    p_sound = SOUND_DESIGN_PROMPT.format(story=story_idea, genre=genre, language=language)

    # Execute requests (sequentially for stability, though parallel is possible)
    # The requirement says "One generation request at a time (simple queue / lock)" at the server level,
    # but for a single user request, we need 3 internal generations. 
    # Since Ollama might struggle with parallel requests on local hardware, sequential is safer.
    
    logger.info("Generating Screenplay...")
    results["screenplay"] = query_ollama(p_screenplay)
    
    if not results["screenplay"]:
        results["meta"]["status"] = "failed_screenplay"
        return results

    # NEW: Generate Synopsis from Screenplay
    logger.info("Generating Synopsis...")
    p_synopsis = SYNOPSIS_PROMPT.format(screenplay_text=results["screenplay"][:12000], language=language) # Limit context if needed
    results["synopsis"] = query_ollama(p_synopsis)

    logger.info("Generating Characters...")
    p_characters = CHARACTERS_PROMPT.format(story=story_idea, genre=genre, language=language) # Fixed: using original prompt vars
    results["characters"] = query_ollama(p_characters)

    logger.info("Generating Sound Design...")
    p_sound = SOUND_DESIGN_PROMPT.format(story=story_idea, genre=genre, language=language)
    results["sound_design"] = query_ollama(p_sound)

    if results["screenplay"] and results["characters"] and results["sound_design"]:
        results["meta"]["status"] = "success"
    else:
        results["meta"]["status"] = "partial_success"

    return results
