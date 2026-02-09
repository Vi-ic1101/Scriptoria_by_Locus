import re

def clean_ai_response(text):
    """
    Cleans the raw output from the AI model.
    Removes markdown code blocks, introductory text, and excessive whitespace.
    """
    if not text:
        return ""

    # First, check if the ENTIRE text is wrapped in a markdown code block.
    # If so, extract the content inside.
    match = re.search(r"^```(?:\w+)?\s*\n(.*?)\s*```$", text, re.DOTALL)
    if match:
        text = match.group(1)
    else:
        # If not entirely wrapped, remove isolated code blocks (unless they are part of the story?)
        # For safety in this prompt engineering context, let's remove them if they appear arbitrarily.
        text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)

    # Remove "Here is the screenplay" type prefixes
    # Regex to look for "Here is..." at the start, case insensitive
    text = re.sub(r"^(Here is|Sure, here is|Certainly, here is).*?:\s*", "", text, flags=re.IGNORECASE | re.DOTALL)

    # Remove "The End" if it looks like a meta-comment
    # (But strictly, prompts said don't include it unless part of story. 
    # We might leave it if the AI puts it there as a creative choice).

    return text.strip()
