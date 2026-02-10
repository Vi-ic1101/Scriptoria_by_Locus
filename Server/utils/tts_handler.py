import edge_tts
import asyncio
import os
import uuid

# Voice options: en-US-ChristopherNeural, en-US-EricNeural, en-US-GuyNeural, en-US-MichelleNeural
# Christopher is great for cinematic narration.

async def _generate_audio(text, output_file, voice="en-US-ChristopherNeural"):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

def text_to_speech(text, output_dir="server/temp"):
    """
    Converts text to speech using Edge-TTS (online, neural).
    Returns the absolute path to the generated MP3 file.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    filename = f"speech_{uuid.uuid4().hex}.mp3"
    filepath = os.path.join(output_dir, filename)

    try:
        # Run async function in synchronous wrapper
        asyncio.run(_generate_audio(text, filepath))
        return filepath
    except Exception as e:
        print(f"EdgeTTS Error: {e}")
        return None
