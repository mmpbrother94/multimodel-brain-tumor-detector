// Function to handle image upload and analysis
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('patient_name', document.getElementById('patient-name').value || 'Unknown Patient');

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // Show the report
            displayReport(result.report);
            
            // Update status
            document.getElementById('analysis-status').textContent = 
                `Analysis complete: ${result.predicted_class} (${Math.round(result.confidence * 100)}% confidence)`;
            
            // Refresh recent scans list
            fetchRecentScans();
        } else {
            document.getElementById('analysis-status').textContent = 
                `Error: ${result.error}`;
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('analysis-status').textContent = 
            'Error uploading and analyzing image';
    }
}

// Function to display the report
function displayReport(report) {
    const reportContainer = document.getElementById('report-container');
    const reportContent = document.getElementById('report-content');
    
    reportContent.textContent = report;
    reportContainer.classList.remove('hidden');
    
    // Scroll the report into view
    reportContainer.scrollIntoView({ behavior: 'smooth' });
}

// Function to download the report
function downloadReport() {
    const reportContent = document.getElementById('report-content').textContent;
    const patientName = document.getElementById('patient-name').value || 'Unknown_Patient';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${patientName}_Brain_Scan_Report_${timestamp}.txt`;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Function to fetch and display recent scans
async function fetchRecentScans() {
    try {
        const response = await fetch('/recent-scans');
        const scans = await response.json();
        
        const chatHistory = document.getElementById('chat-history');
        chatHistory.innerHTML = '<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Recent Scans</h3>';
        
        scans.forEach(scan => {
            const scanItem = document.createElement('div');
            scanItem.className = 'recent-scan-item bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors cursor-pointer mb-3';
            
            scanItem.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                        <img src="/uploads/${scan.filename}" alt="Scan thumbnail" 
                             class="w-16 h-16 rounded-md object-cover bg-gray-900"/>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white truncate">
                            ${scan.patient_name}
                        </p>
                        <p class="text-xs text-gray-400">
                            ${scan.prediction} (${Math.round(scan.confidence * 100)}%)
                        </p>
                        <p class="text-xs text-gray-500">
                            ${scan.timestamp}
                        </p>
                    </div>
                </div>
            `;
            
            // Add click handler to show the report
            scanItem.addEventListener('click', () => {
                displayReport(scan.report);
            });
            
            chatHistory.appendChild(scanItem);
        });
    } catch (error) {
        console.error('Error fetching recent scans:', error);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('mri-upload');
    const downloadBtn = document.getElementById('download-report');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleImageUpload);
    }
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadReport);
    }
    
    // Initial fetch of recent scans
    fetchRecentScans();
});
