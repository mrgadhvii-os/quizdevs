// static/js/script.js
document.addEventListener('DOMContentLoaded', function() {
    const quizUrlInput = document.getElementById('quiz-url');
    const extractBtn = document.getElementById('extract-btn');
    const getAnswersBtn = document.getElementById('get-answers-btn');
    const questionsSection = document.getElementById('questions-section');
    const questionsContainer = document.getElementById('questions-container');
    const answersSection = document.getElementById('answers-section');
    const answersContainer = document.getElementById('answers-container');

    let extractedQuestions = null;

    // Function to show loading state on button
    function setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    // Function to show error message
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorElement.style.color = '#e74c3c';
        errorElement.style.padding = '10px';
        errorElement.style.marginTop = '10px';
        errorElement.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
        errorElement.style.borderRadius = '4px';
        
        return errorElement;
    }

    // Extract quiz questions
    extractBtn.addEventListener('click', function() {
        const quizUrl = quizUrlInput.value.trim();
        
        if (!quizUrl) {
            quizUrlInput.focus();
            return;
        }

        // Clear previous data
        questionsContainer.innerHTML = '';
        answersContainer.innerHTML = '';
        answersSection.style.display = 'none';
        
        setButtonLoading(extractBtn, true);
        
        fetch('/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quiz_url: quizUrl }),
        })
        .then(response => response.json())
        .then(data => {
            setButtonLoading(extractBtn, false);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to extract quiz content');
            }
            
            extractedQuestions = data.data;
            
            if (extractedQuestions.length === 0) {
                questionsContainer.appendChild(
                    showError('No questions found in the provided URL. Please check and try again.')
                );
                questionsSection.style.display = 'block';
                return;
            }
            
            renderQuestions(extractedQuestions);
            questionsSection.style.display = 'block';
            
            // Scroll to questions section
            questionsSection.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            setButtonLoading(extractBtn, false);
            questionsContainer.appendChild(showError(error.message));
            questionsSection.style.display = 'block';
        });
    });

    // Render extracted questions
    function renderQuestions(questions) {
        questions.forEach((question, index) => {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.style.animation = `fadeIn 0.5s ease ${index * 0.1}s forwards`;
            questionElement.style.opacity = '0';
            
            const questionText = document.createElement('div');
            questionText.className = 'question-text';
            questionText.textContent = `Question ${index + 1}: ${question.question}`;
            
            const optionsList = document.createElement('ul');
            optionsList.className = 'options-list';
            
            question.options.forEach((option, optIdx) => {
                const optionItem = document.createElement('li');
                optionItem.className = 'option-item';
                
                const optionLetter = document.createElement('span');
                optionLetter.className = 'option-letter';
                optionLetter.textContent = String.fromCharCode(65 + optIdx); // A, B, C, etc.
                
                const optionText = document.createElement('span');
                optionText.className = 'option-text';
                optionText.textContent = option;
                
                optionItem.appendChild(optionLetter);
                optionItem.appendChild(optionText);
                optionsList.appendChild(optionItem);
            });
            
            questionElement.appendChild(questionText);
            questionElement.appendChild(optionsList);
            questionsContainer.appendChild(questionElement);
        });
    }

    // Get AI-generated answers
    getAnswersBtn.addEventListener('click', function() {
        if (!extractedQuestions || extractedQuestions.length === 0) {
            return;
        }
        
        setButtonLoading(getAnswersBtn, true);
        answersContainer.innerHTML = '';
        
        fetch('/get_answers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ questions_data: extractedQuestions }),
        })
        .then(response => response.json())
        .then(data => {
            setButtonLoading(getAnswersBtn, false);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to get answers');
            }
            
            // Display the answers
            answersContainer.textContent = data.data;
            answersSection.style.display = 'block';
            
            // Scroll to answers section
            answersSection.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            setButtonLoading(getAnswersBtn, false);
            answersContainer.textContent = error.message;
            answersSection.style.display = 'block';
        });
    });

    // Update server status every 30 seconds
    function updateServerStatus() {
        fetch('/server_status')
            .then(response => response.json())
            .then(data => {
                const statusValue = document.getElementById('status-value');
                const statusIndicator = statusValue.querySelector('.status-indicator');
                
                statusValue.innerHTML = `
                    <span class="status-indicator ${data.status === 'Running' ? 'online' : 'offline'}"></span>
                    ${data.status}
                `;
                
                // Update other status values
                document.querySelectorAll('.status-value').forEach(el => {
                    const label = el.previousElementSibling.textContent.slice(0, -1).toLowerCase();
                    
                    if (label === 'status') return; // Already updated
                    
                    const dataKey = Object.keys(data).find(key => key.toLowerCase() === label);
                    if (dataKey) {
                        el.textContent = data[dataKey];
                    }
                });
            })
            .catch(error => {
                console.error('Error updating server status:', error);
            });
    }
    
    setInterval(updateServerStatus, 30000);
});