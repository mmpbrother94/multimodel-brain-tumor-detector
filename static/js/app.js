document.addEventListener('DOMContentLoaded', () => {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Add visible class to all children with animation classes
                entry.target.querySelectorAll('.rise-up, .feature-text, .feature-card, .highlight-item').forEach(el => {
                    el.classList.add('visible');
                });
            }
        });
    }, observerOptions);

    // Observe all sections and elements with animations
    document.querySelectorAll('.fade-in-section, .feature-section').forEach(el => {
        observer.observe(el);
    });

    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Make sure body is scrollable
    document.body.style.overflowY = 'scroll';
    
    // Element References
    const menuTrigger = document.getElementById('menu-trigger');
    const scanTypeDropdown = document.getElementById('scan-type-dropdown');
    const scanOptions = document.querySelectorAll('.scan-option');
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const uploadTrigger = document.getElementById('upload-trigger');
    const dropZone = document.getElementById('drop-zone');
    const sendButton = document.getElementById('send-message');
    const newChatButton = document.getElementById('new-chat');
    const chatHistory = document.getElementById('chat-history');
    const imagePreview = document.getElementById('image-preview');
    const currentScanType = document.getElementById('current-scan-type');
    const imageProperties = document.getElementById('image-properties');
    const analysisProgress = document.getElementById('analysis-progress');
    const removeImageBtn = document.getElementById('remove-image');

    let currentAnalysis = null;
    let currentImage = null;
    let isDropdownOpen = false;
    let messageHistory = [];

    // Initialize with welcome message
    function showWelcomeMessage() {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'assistant-message';
        welcomeDiv.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <div class="flex-1 space-y-3">
                    <p>Welcome to Medical AI Assistant! Let's analyze your medical images.</p>
                    <p class="text-gray-400">Please select the type of scan from the dropdown menu above to begin.</p>
                </div>
            </div>
        `;
        chatMessages.appendChild(welcomeDiv);
    }

    // Show welcome message on load
    showWelcomeMessage();

    // Chat Message Handler
    function addMessage(content, type = 'user') {
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'user' ? 'user-message' : 'assistant-message';
        
        let avatarIcon;
        if (type === 'assistant') {
            avatarIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>';
        } else if (type === 'system') {
            avatarIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>';
        } else {
            avatarIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>';
        }

        messageDiv.innerHTML = `
            <div class="flex items-start gap-4">
                <div class="w-8 h-8 rounded-full ${type === 'assistant' ? 'bg-blue-600' : type === 'system' ? 'bg-purple-600' : 'bg-green-600'} flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${avatarIcon}
                    </svg>
                </div>
                <div class="flex-1">
                    ${content}
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // File Upload Handlers
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = {
                    file: file,
                    width: img.width,
                    height: img.height,
                    size: formatFileSize(file.size),
                    type: file.type
                };
                
                // Update preview
                document.getElementById('preview-img').src = e.target.result;
                imagePreview.classList.remove('hidden');
                
                // Update properties
                imageProperties.innerHTML = `
                    <p>Size: ${currentImage.size}</p>
                    <p>Dimensions: ${currentImage.width}x${currentImage.height}px</p>
                    <p>Type: ${file.type}</p>
                `;

                // Hide drop zone
                dropZone.classList.add('hidden');
                
                // Add system message
                addMessage(`Image uploaded: ${file.name}`, 'system');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Drag and Drop Event Handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('border-blue-500', 'bg-blue-500', 'bg-opacity-10');
    }

    function unhighlight() {
        dropZone.classList.remove('border-blue-500', 'bg-blue-500', 'bg-opacity-10');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFile(file);
    }

    // File Input Handler
    uploadTrigger.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Remove Image Handler
    removeImageBtn.addEventListener('click', () => {
        currentImage = null;
        document.getElementById('preview-img').src = '';
        imagePreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        imageProperties.innerHTML = '<p>No image uploaded</p>';
        addMessage('Image removed', 'system');
    });

    // Scan Type Dropdown Functionality
    menuTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        isDropdownOpen = !isDropdownOpen;
        scanTypeDropdown.style.display = isDropdownOpen ? 'block' : 'none';
        scanTypeDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (isDropdownOpen && !scanTypeDropdown.contains(e.target) && e.target !== menuTrigger) {
            isDropdownOpen = false;
            scanTypeDropdown.style.display = 'none';
            scanTypeDropdown.classList.remove('show');
        }
    });

    // Handle scan type selection
    scanOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            const value = option.getAttribute('data-value');
            const title = option.querySelector('.scan-option-title').textContent;
            
            // Update current selection
            currentScanType.textContent = title;
            
            // Remove active class from all options
            scanOptions.forEach(opt => {
                opt.classList.remove('active');
            });
            
            // Add active class to selected option
            option.classList.add('active');
            
            // Close dropdown
            isDropdownOpen = false;
            scanTypeDropdown.style.display = 'none';
            scanTypeDropdown.classList.remove('show');
            
            // You can handle the selected scan type here
            console.log('Selected scan type:', value);
        });
    });

    // New Chat Button Handler
    newChatButton.addEventListener('click', () => {
        resetChat();
    });

    // Upload Trigger Handler
    uploadTrigger.addEventListener('click', () => {
        const selectedValue = scanOptions.find(option => option.classList.contains('active'))?.dataset.value;
        if (!selectedValue) {
            addMessage('Please select a scan type before uploading an image.', 'system');
            return;
        }
        fileInput.click();
    });

    // Send Message Handler
    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            messageInput.value = '';
            processUserMessage(message);
        }
    });

    // Message Input Handler
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });

    function updateImageRequirements(scanType) {
        const requirements = {
            // Brain & Neurological
            'brain_mri': 'Accepted formats: DICOM, NIfTI files. Required: T1, T2, and FLAIR sequences if available.',
            'brain_ct': 'Accepted formats: DICOM, high-resolution JPEG/PNG. Ensure complete brain series.',
            'spine_mri': 'Accepted formats: DICOM, NIfTI. Include sagittal and axial views.',
            'angiogram': 'Accepted formats: DICOM, high-resolution JPEG/PNG. Include all contrast phases.',
            
            // Chest & Cardiac
            'chest_xray': 'Accepted formats: DICOM, high-resolution JPEG/PNG. PA and lateral views preferred.',
            'chest_ct': 'Accepted formats: DICOM. Include both with/without contrast if available.',
            'cardiac_mri': 'Accepted formats: DICOM. Include all cardiac cycles and views.',
            'ecg': 'Accepted formats: PDF, SVG, or PNG. 12-lead ECG preferred.',
            
            // Abdominal & Pelvic
            'abdominal_ct': 'Accepted formats: DICOM. Include both with/without contrast phases.',
            'abdominal_mri': 'Accepted formats: DICOM, NIfTI. T1 and T2 weighted sequences required.',
            'ultrasound': 'Accepted formats: DICOM, high-resolution JPEG/PNG.',
            'pelvic_ct': 'Accepted formats: DICOM. Include complete pelvic series.',
            
            // Musculoskeletal
            'bone_xray': 'Accepted formats: DICOM, high-resolution JPEG/PNG. Multiple views recommended.',
            'joint_mri': 'Accepted formats: DICOM. T1, T2, and PD sequences preferred.',
            'dexa': 'Accepted formats: DICOM, high-resolution JPEG/PNG.',
            'arthrogram': 'Accepted formats: DICOM. Include pre and post contrast images.',
            
            // Cancer & Nuclear
            'pet_ct': 'Accepted formats: DICOM. Include both PET and CT series.',
            'mammogram': 'Accepted formats: DICOM. Include all standard views.',
            'nuclear': 'Accepted formats: DICOM. Include all time points.',
            
            // Other Imaging
            'dental_xray': 'Accepted formats: DICOM, high-resolution JPEG/PNG.',
            'fluoroscopy': 'Accepted formats: DICOM, video formats (MP4).',
            'endoscopy': 'Accepted formats: High-resolution JPEG/PNG, MP4 for video sequences.'
        };

        addMessage(requirements[scanType] || 'Please upload a high-quality medical image in DICOM or high-resolution format.', 'system');
    }

    function startAnalysis(file) {
        // Update progress bar
        const progressBar = analysisProgress.querySelector('.bg-blue-600');
        progressBar.style.width = '0%';
        
        addMessage('Starting analysis...', 'system');
        
        // Simulate analysis progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                completeAnalysis();
            }
        }, 500);
    }

    function completeAnalysis() {
        const selectedValue = scanOptions.find(option => option.classList.contains('active'))?.dataset.value;
        const analysis = generateAnalysisResult(selectedValue);
        
        currentAnalysis = analysis;
        
        const resultMessage = `
            <div class="space-y-3">
                <h3 class="font-semibold text-lg text-blue-400">Analysis Complete</h3>
                <div class="space-y-2">
                    <p><span class="text-gray-400">Diagnosis:</span> ${analysis.diagnosis}</p>
                    <p><span class="text-gray-400">Confidence:</span> ${analysis.confidence}</p>
                    <p><span class="text-gray-400">Findings:</span> ${analysis.findings}</p>
                    <p><span class="text-gray-400">Recommendations:</span> ${analysis.recommendations}</p>
                </div>
            </div>
        `;
        
        addMessage(resultMessage, 'assistant');
    }

    function generateAnalysisResult(scanType) {
        const results = {
            // Brain & Neurological
            'brain_mri': {
                diagnosis: 'Normal brain structure and signal intensity',
                confidence: '95%',
                findings: 'No acute infarction, mass, or hemorrhage. Normal ventricles and sulci.',
                recommendations: 'Routine follow-up as clinically indicated.'
            },
            'brain_ct': {
                diagnosis: 'No acute intracranial abnormality',
                confidence: '93%',
                findings: 'No hemorrhage, mass effect, or midline shift.',
                recommendations: 'No immediate follow-up required.'
            },
            'spine_mri': {
                diagnosis: 'Normal spinal alignment and cord signal',
                confidence: '94%',
                findings: 'No disc herniation or spinal stenosis.',
                recommendations: 'Continue current management plan.'
            },
            
            // Chest & Cardiac
            'chest_xray': {
                diagnosis: 'Clear lungs bilaterally',
                confidence: '92%',
                findings: 'Normal heart size, clear lung fields, no effusions.',
                recommendations: 'No acute chest findings.'
            },
            'cardiac_mri': {
                diagnosis: 'Normal cardiac function',
                confidence: '96%',
                findings: 'Normal ejection fraction, wall motion, and valve function.',
                recommendations: 'Routine cardiac follow-up.'
            },
            'ecg': {
                diagnosis: 'Normal sinus rhythm',
                confidence: '97%',
                findings: 'Regular rate and rhythm, normal intervals and axis.',
                recommendations: 'No acute cardiac intervention needed.'
            },
            
            // Default for other scan types
            'default': {
                diagnosis: 'Analysis complete',
                confidence: '90%',
                findings: 'Please consult with healthcare provider for detailed interpretation.',
                recommendations: 'Follow up with your doctor for complete evaluation.'
            }
        };
        
        return results[scanType] || results['default'];
    }

    function processUserMessage(message) {
        // Simple response system
        setTimeout(() => {
            if (message.toLowerCase().includes('help')) {
                addMessage(`
                    <div class="space-y-2">
                        <p>Here's how to use the Medical AI Assistant:</p>
                        <ol class="list-decimal list-inside space-y-1 text-gray-300">
                            <li>Select the type of scan from the dropdown menu</li>
                            <li>Upload your medical image using the upload button</li>
                            <li>Wait for the analysis to complete</li>
                            <li>Ask any questions about the results</li>
                        </ol>
                    </div>
                `, 'assistant');
            } else {
                addMessage('I understand your question. How else can I help you with the analysis?', 'assistant');
            }
        }, 500);
    }

    function resetChat() {
        chatMessages.innerHTML = '';
        currentAnalysis = null;
        currentImage = null;
        imagePreview.classList.add('hidden');
        imageProperties.innerHTML = '<p>No image uploaded</p>';
        scanOptions.forEach(option => option.classList.remove('active'));
        currentScanType.textContent = 'Not selected';
        const progressBar = analysisProgress.querySelector('.bg-blue-600');
        progressBar.style.width = '0%';
        
        // Add welcome message
        showWelcomeMessage();
    }

    const sections = document.querySelectorAll('.fullscreen-section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Fix button click handling
    const ctaButtons = document.querySelectorAll('.glow-button');
    ctaButtons.forEach(button => {
        button.style.cursor = 'pointer';
        button.addEventListener('click', (e) => {
            const href = button.getAttribute('href');
            if (href?.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
    
    // Update active navigation link based on scroll position
    function updateActiveLink() {
        const scrollY = window.scrollY;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    // Smooth scroll to section
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (href?.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    const headerOffset = 80;
                    const elementPosition = targetSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Enable mouse wheel scrolling
    window.addEventListener('wheel', (e) => {
        // Default scroll behavior is maintained
        // This ensures the page responds to mouse wheel events
    }, { passive: true });
    
    // Listen for scroll events with throttling
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateActiveLink();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // Initial check for active link
    updateActiveLink();
});

let currentScanType = null;
let messageHistory = [];

// Initialize chat functionality
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const menuTrigger = document.getElementById('menu-trigger');
    const scanTypeDropdown = document.getElementById('scan-type-dropdown');

    // Handle send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessageToChat('user', message);

        // Send message to backend
        fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                scanType: currentScanType
            })
        })
        .then(response => response.json())
        .then(data => {
            addMessageToChat('assistant', data.response);
        })
        .catch(error => {
            console.error('Error:', error);
            addMessageToChat('assistant', 'Sorry, there was an error processing your request.');
        });

        messageInput.value = '';
    }

    // Add message to chat UI
    function addMessageToChat(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-text">${content}</span>
                <span class="message-time">${timestamp}</span>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        messageHistory.push({
            sender: sender,
            content: content,
            timestamp: timestamp
        });
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Handle scan type selection
    document.querySelectorAll('.scan-option').forEach(option => {
        option.addEventListener('click', () => {
            currentScanType = option.dataset.value;
            document.getElementById('current-scan-type').textContent = option.querySelector('.scan-option-title').textContent;
            scanTypeDropdown.classList.add('hidden');
        });
    });

    menuTrigger.addEventListener('click', () => {
        scanTypeDropdown.classList.toggle('hidden');
    });
});

let currentImage = null;

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Display image preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Scan preview" class="max-w-xs rounded-lg shadow-lg">
            <button class="analyze-btn">Analyze Image</button>
        `;
        
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(preview);
        
        // Attach analyze button listener
        preview.querySelector('.analyze-btn').addEventListener('click', () => analyzeImage(file));
    }
    reader.readAsDataURL(file);
    currentImage = file;
}

async function analyzeImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('http://localhost:5000/analyze', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            addMessageToChat('assistant', `Error: ${data.error}`);
            return;
        }
        
        const resultMessage = `
            Analysis Results:
            - Prediction: ${data.prediction}
            - Confidence: ${(data.confidence * 100).toFixed(2)}%
        `;
        
        addMessageToChat('assistant', resultMessage);
        
    } catch (error) {
        console.error('Error:', error);
        addMessageToChat('assistant', 'Sorry, there was an error analyzing the image.');
    }
}
