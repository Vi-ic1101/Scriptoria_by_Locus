# Strict, structured prompts for Scriptoria_by_Locus

SCREENPLAY_PROMPT = """
You are a professional screenwriter. Generate the following content STRICTLY in {language}.
Write a short screenplay based on the story idea below.
Follow these RULES strictly:
1. Use standard screenplay format.
2. Scene headings must be in ALL CAPS and start with INT. or EXT.
3. Character names must be centered (or capitalized) above dialogue.
4. Keep the output pure screenplay. NO introductory text, NO markdown, NO "Here is the screenplay".
5. Do not write "The End" or similar markers unless part of the story.

Story Idea: {story}
Genre: {genre}
Approximate Scene Count: {scene_count}

OUTPUT ONLY THE SCREENPLAY CONTENT.
"""

CHARACTERS_PROMPT = """
You are a character psychology expert. Generate the following content STRICTLY in {language}.
Create detailed character profiles for the story idea below.
Follow these RULES strictly:
1. For each main character, provide: Name, Role, Archetype, Core Drive, and a brief Arc Summary.
2. Format each character clearly with separators.
3. NO introductory text. NO markdown. NO "Here are the characters".

Story Idea: {story}
Genre: {genre}

OUTPUT ONLY THE CHARACTER PROFILES.
"""

SOUND_DESIGN_PROMPT = """
You are a professional sound designer for film. Generate the following content STRICTLY in {language}.
Create a sound design list for the story idea below.
Follow these RULES strictly:
1. Break down by scene (Scene 1, Scene 2, etc.).
2. For each scene, list: Ambient layer, Specific SFX, and Musical Mood.
3. NO introductory text. NO markdown. NO "Here is the sound design".

Story Idea: {story}
Genre: {genre}

OUTPUT ONLY THE SOUND DESIGN LIST.
"""

SYNOPSIS_PROMPT = """
You are a professional script reader. Generate the following content STRICTLY in {language}.
Read the screenplay below and create a Logline and Synopsis.
Follow these RULES strictly:
1. Logline: A single, compelling sentence summarizing the story.
2. Synopsis: A concise summary (100-150 words) of the plot.
3. NO markdown found in the output. NO formatting symbols like ** or ##.
4. Format exactly as:
Logline: [Your logline here]

Synopsis: [Your synopsis here]

Screenplay Text:
{screenplay_text}
"""
