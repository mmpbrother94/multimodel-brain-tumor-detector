from flask import Flask, request, jsonify, render_template, url_for, send_file
from flask_cors import CORS
import os
import numpy as np
from datetime import datetime
import io
from PIL import Image
import tensorflow as tf
import traceback
from werkzeug.utils import secure_filename

app = Flask(__name__, 
    static_folder='static',
    template_folder='templates')
CORS(app)

# Global variables
model = None
CLASSES = ['glioma', 'meningioma', 'no_tumor', 'pituitary']
INPUT_SIZE = (128, 128)  # Model's expected input size
CLASS_NAMES = ['Glioma', 'Meningioma', 'No Tumor', 'Pituitary']

# Store recent scans in memory (in a production environment, this should be in a database)
recent_scans = []

# Define upload folder
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return filename.endswith(('.png', '.jpg', '.jpeg'))

def init_model():
    """Initialize the ML model"""
    global model
    try:
        model_path = os.path.join(os.path.dirname(__file__), 'brain_tumor_multiclass_model.h5')
        if os.path.exists(model_path):
            print(f"Loading model from {model_path}")
            print(f"Expected input size: {INPUT_SIZE}")
            model = tf.keras.models.load_model(model_path)
            # Print model summary to see expected input shape
            model.summary()
            print("Model loaded successfully!")
            return True
        else:
            print(f"Error: Model file not found at {model_path}")
            return False
    except Exception as e:
        print(f"Error initializing model: {str(e)}")
        return False

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/report')
def report():
    return render_template('report.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/features')
def features():
    return render_template('features.html')

@app.route('/assistant')
def assistant():
    return render_template('assistant.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    scan_type = data.get('scanType', '')
    
    if 'scan' in message.lower():
        response = f"I'll help you analyze the {scan_type} scan. Please upload an image."
    elif 'symptom' in message.lower():
        response = "Could you provide more details about the symptoms you're experiencing?"
    else:
        response = "I'm your medical AI assistant. How can I help you today?"

    return jsonify({
        'response': response,
        'timestamp': datetime.now().strftime('%H:%M')
    })

@app.route('/analyze', methods=['POST'])
def analyze_image():
    if model is None:
        if not init_model():
            return jsonify({'error': 'Model not initialized'}), 503
        
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
            
        file = request.files['image']
        patient_name = request.form.get('patient_name', 'Not Provided')
        
        # Save the uploaded image
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Read and process image
        image = Image.open(filepath)
        
        # Convert to grayscale (model expects 1 channel)
        if image.mode != 'L':
            image = image.convert('L')
        
        # Resize image to match model's expected input size
        image = image.resize(INPUT_SIZE)
        
        # Convert to numpy array and preprocess
        img_array = np.array(image)
        
        # Reshape to (height, width, channels)
        img_array = img_array.reshape(INPUT_SIZE[0], INPUT_SIZE[1], 1)
        
        # Add batch dimension (N, H, W, C) where C=1 for grayscale
        img_array = np.expand_dims(img_array, axis=0)
        
        # Normalize pixel values
        img_array = img_array / 255.0
        
        # Make prediction
        prediction = model.predict(img_array)
        predicted_class = CLASSES[np.argmax(prediction[0])]
        confidence = float(np.max(prediction[0]))
        
        # Generate report
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        report = generate_tumor_report(predicted_class, confidence, patient_name)
        
        # Create scan record
        scan_record = {
            'filename': filename,
            'filepath': filepath,
            'patient_name': patient_name,
            'timestamp': current_time,
            'prediction': predicted_class,
            'confidence': confidence,
            'report': report
        }
        
        # Add to recent scans (keep only last 10)
        recent_scans.insert(0, scan_record)
        if len(recent_scans) > 10:
            recent_scans.pop()
        
        return jsonify({
            'success': True,
            'predicted_class': predicted_class,
            'confidence': confidence,
            'report': report,
            'filename': filename
        })
        
    except Exception as e:
        print(f"Error during analysis: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def generate_tumor_report(predicted_class, confidence, patient_name):
    """Generate a detailed tumor analysis report"""
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    report = f"""BRAIN TUMOR DETECTION REPORT
Generated on: {current_time}

PATIENT INFORMATION
Patient Name: {patient_name}

ANALYSIS RESULTS
Scan Type: MRI Brain Scan
Detection: {predicted_class}
Confidence: {confidence:.2%}

MEDICAL RECOMMENDATIONS
"""
    
    if predicted_class == "no_tumor":
        report += """- No signs of tumor detected
- Regular check-ups recommended
- Maintain healthy lifestyle
- Follow-up scan in 12 months"""
    else:
        report += f"""- {predicted_class.replace('_', ' ').title()} tumor detected with {confidence:.2%} confidence
- Immediate consultation with neurologist recommended
- Further diagnostic tests may be required
- Regular monitoring and follow-up essential
- Consider additional imaging studies
- Develop treatment plan with healthcare team"""
    
    report += "\n\nNote: This is an AI-generated report and should be reviewed by a qualified medical professional."
    return report

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        patient_name = request.form.get('patientName', 'Unknown Patient')
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file and allowed_file(file.filename):
            # Save the file
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Process image
            img = Image.open(filepath)
            img = img.convert('L')  # Convert to grayscale
            img = img.resize((INPUT_SIZE, INPUT_SIZE))
            img_array = np.array(img)
            img_array = img_array / 255.0
            img_array = np.expand_dims(img_array, axis=[0, -1])
            
            # Make prediction
            prediction = model.predict(img_array)
            class_idx = np.argmax(prediction[0])
            confidence = float(prediction[0][class_idx])
            predicted_class = CLASS_NAMES[class_idx]
            
            # Create scan record
            scan_record = {
                'filename': filename,
                'filepath': filepath,
                'patient_name': patient_name,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'prediction': predicted_class,
                'confidence': confidence
            }
            
            # Add to recent scans (keep only last 10)
            recent_scans.insert(0, scan_record)
            if len(recent_scans) > 10:
                recent_scans.pop()
            
            return jsonify({
                'success': True,
                'prediction': predicted_class,
                'confidence': confidence,
                'filename': filename
            })
            
        return jsonify({'error': 'File type not allowed'}), 400
    
    except Exception as e:
        app.logger.error(f"Error processing upload: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/recent-scans', methods=['GET'])
def get_recent_scans():
    return jsonify(recent_scans)

if __name__ == '__main__':
    print("Starting the server...")
    if init_model():
        print("Model initialized successfully, starting Flask app...")
        app.run(debug=True, port=5000)
    else:
        print("Warning: Failed to initialize model. Starting Flask app without model...")
