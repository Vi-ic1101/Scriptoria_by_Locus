import easyocr
import io
from PIL import Image
import numpy as np

# Initialize reader once (it loads model into memory)
# Using generic english model. GPU will be used if available.
reader = easyocr.Reader(['en'])

def extract_text_from_image(image_bytes):
    """
    Extracts text from an image byte stream using EasyOCR.
    """
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to numpy array for EasyOCR
        image_np = np.array(image)
        
        # Read text
        results = reader.readtext(image_np, detail=0)
        
        # Join results into a single string
        extracted_text = " ".join(results)
        
        return extracted_text.strip()
    except Exception as e:
        print(f"OCR Error: {e}")
        return None
