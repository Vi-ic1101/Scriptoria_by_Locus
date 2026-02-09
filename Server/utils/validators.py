import re

def validate_story_input(data):
    """
    Validates the input JSON for story generation.
    Returns: (is_valid, error_message)
    """
    if not data:
        return False, "No input data provided."
    
    story = data.get("story", "").strip()
    if not story:
        return False, "Story idea is required."
    
    if len(story) > 1000:
        return False, "Story idea is too long (max 1000 characters)."
    
    genre = data.get("genre", "").strip()
    if len(genre) > 50:
         return False, "Genre is too long (max 50 characters)."
    
    return True, None
