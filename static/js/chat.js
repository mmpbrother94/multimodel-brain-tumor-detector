let messageHistory = [];
let currentScanType = null;

document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const fileInput = document.getElementById('file-upload');

    // Handle file upload
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            // Show uploading message
            addMessageToChat('user', `Uploading scan image: ${file.name}`);

            fetch('http://localhost:5000/analyze', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    addMessageToChat('assistant', `Error: ${data.error}`);
                } else {
                    const resultMessage = `Analysis Results:
                    • Prediction: ${data.prediction}
                    • Confidence: ${(data.confidence * 100).toFixed(2)}%`;
                    addMessageToChat('assistant', resultMessage);
                }
            })
            .catch(error => {
                addMessageToChat('assistant', 'Error analyzing the image. Please try again.');
                console.error('Error:', error);
            });
        }
    });

    // Handle send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        addMessageToChat('user', message);

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

    function addMessageToChat(sender, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
                <span class="timestamp">${new Date().toLocaleTimeString()}</span>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});