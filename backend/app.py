# Save as backend.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from markitdown import MarkItDown
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image
import io
import torch

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

trocr_processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
trocr_model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-handwritten")

def is_image(filename):
    ext = filename.lower().rsplit('.', 1)[-1]
    return ext in ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff']

@app.route('/api/ocr', methods=['POST'])
def ocr():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    filename = file.filename

    if is_image(filename):
        try:
            image = Image.open(file.stream).convert("RGB")
            pixel_values = trocr_processor(image, return_tensors="pt").pixel_values
            with torch.no_grad():
                generated_ids = trocr_model.generate(pixel_values)
            text = trocr_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            lines = text.splitlines()
            return jsonify({"lines": lines})
        except Exception as e:
            return jsonify({"error": f"TrOCR failed: {str(e)}"}), 500
    else:
        try:
            file_stream = io.BytesIO(file.read())
            md = MarkItDown()
            result = md.convert_stream(file_stream, filename=filename)
            lines = result.text_content.splitlines()
            return jsonify({"lines": lines})
        except Exception as e:
            return jsonify({"error": f"MarkItDown failed: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002)