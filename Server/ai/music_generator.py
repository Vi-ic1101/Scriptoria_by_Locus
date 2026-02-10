import requests
import os
import uuid
import time
import json
import numpy as np
import scipy.io.wavfile
import random

# --- CONFIG ---
API_URL = "https://router.huggingface.co/hf-inference/models/facebook/musicgen-small"
SAMPLE_RATE = 44100
HF_TOKEN = os.getenv("HF_TOKEN")

# --- LOCAL SYNTHESIZER (FALLBACK) ---
NOTE_FREQS = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77
}

SCALES = {
    'happy': [0, 2, 4, 5, 7, 9, 11], 
    'sad': [0, 2, 3, 5, 7, 8, 10],   
    'tense': [0, 1, 4, 5, 7, 8, 11], 
    'peaceful': [0, 2, 4, 7, 9],     
    'scary': [0, 1, 3, 6, 8, 9]      
}

def karplus_strong(frequency, duration, decay_factor=0.996):
    N = int(SAMPLE_RATE / frequency)
    buf = np.random.uniform(-1, 1, N)
    n_samples = int(SAMPLE_RATE * duration)
    samples = np.zeros(n_samples)
    for i in range(N): samples[i] = buf[i]
    for i in range(N, n_samples):
        samples[i] = 0.5 * (samples[i-N] + samples[i-N-1]) * decay_factor
    return samples

def apply_reverb(audio, delay_ms=100, decay=0.5):
    delay_samples = int(SAMPLE_RATE * delay_ms / 1000)
    output = np.zeros(len(audio) + delay_samples * 5)
    output[:len(audio)] = audio
    for i in range(delay_samples, len(output)):
        output[i] += output[i - delay_samples] * decay
    return output[:len(audio)] 

def get_frequencies(scale_name, root_freq=261.63):
    intervals = SCALES.get(scale_name, SCALES['happy'])
    freqs = []
    for i in intervals:
        freqs.append(root_freq * (2 ** (i / 12.0)))
    for i in intervals:
        freqs.append(root_freq * 2 * (2 ** (i / 12.0)))
    return freqs

def generate_local_track(mood_text, duration=10):
    """Generates music locally using Karplus-Strong synthesis."""
    mood_text = mood_text.lower()
    scale, tempo, root = 'happy', 0.5, 261.63
    
    if 'sad' in mood_text or 'melancholic' in mood_text:
        scale, tempo, root = 'sad', 1.2, 196.00
    elif 'tense' in mood_text:
        scale, tempo = 'tense', 0.4
    elif 'peaceful' in mood_text:
        scale, tempo = 'peaceful', 1.5
        
    freqs = get_frequencies(scale, root)
    audio_len = int(SAMPLE_RATE * duration)
    mixed_audio = np.zeros(audio_len)
    
    curr_time = 0
    while curr_time < duration - 1:
        f = random.choice(freqs)
        note_len = 2.0
        if random.random() < 0.3: # Chord
            for _ in range(3):
                tone = karplus_strong(random.choice(freqs), note_len)
                start = int(curr_time * SAMPLE_RATE)
                end = start + len(tone)
                if end > audio_len:
                    tone = tone[:audio_len - start]
                    end = audio_len
                mixed_audio[start:end] += tone * 0.5
        else: # Note
            tone = karplus_strong(f, note_len)
            start = int(curr_time * SAMPLE_RATE)
            end = start + len(tone)
            if end > audio_len:
                tone = tone[:audio_len - start]
                end = audio_len
            mixed_audio[start:end] += tone
        curr_time += tempo * random.choice([0.5, 1])
        
    mixed_audio = apply_reverb(mixed_audio)
    max_val = np.max(np.abs(mixed_audio))
    if max_val > 0: mixed_audio = mixed_audio / max_val * 32767
    return mixed_audio.astype(np.int16)

# --- HYBRID GENERATOR ---
def generate_music(prompt, duration=10, output_dir="server/temp_music"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = f"music_{uuid.uuid4().hex}.wav"
    filepath = os.path.join(output_dir, filename)
    
    # 1. Try Cloud API if Token Exists (or blindly try if we want to risk 401)
    # The user got 401, so blind try without token fails.
    # But maybe they will add a token later.
    hf_token = os.getenv("HF_TOKEN") or HF_TOKEN
    
    if hf_token:
        print(f"🎵 Attempting Cloud Generation (MusicGen)...")
        headers = {"Authorization": f"Bearer {hf_token}"}
        payload = {"inputs": prompt}
        
        for _ in range(3): # Retries
            try:
                response = requests.post(API_URL, headers=headers, json=payload)
                if response.status_code == 200:
                    with open(filepath, "wb") as f:
                        f.write(response.content)
                    return filepath
                elif response.status_code == 503:
                    time.sleep(10)
                    continue
                else:
                    print(f"Cloud API Failed ({response.status_code}): {response.text}")
                    break
            except Exception as e:
                print(f"Cloud Request Error: {e}")
                break
    else:
        print("⚠️ No HF_TOKEN found. Skipping Cloud Generation.")

    # 2. Fallback to Local Synth
    print(f"🎹 Falling back to Local Acoustic Synth...")
    try:
        audio_data = generate_local_track(prompt, duration)
        scipy.io.wavfile.write(filepath, SAMPLE_RATE, audio_data)
        return filepath
    except Exception as e:
        print(f"Local Synth Error: {e}")
        return None
