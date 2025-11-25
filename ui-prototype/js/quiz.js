/**
 * SmartTutor - Quiz Integration
 * Handles quiz generation, submission, and evaluation via backend API
 */

// Quiz state
let currentQuiz = null;
let studentAnswers = [];

/**
 * Initialize quiz page - Generate quiz from backend
 */
async function initializeQuiz() {
    const urlParams = new URLSearchParams(window.location.search);
    const topic = urlParams.get('topic') || 'General';
    const subject = urlParams.get('subject') || 'Biology';

    console.log('Initializing quiz for:', { topic, subject });

    // Show loading state
    const quizContainer = document.getElementById('quizForm');
    quizContainer.innerHTML = `
        <div class="loading-spinner" style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; animation: spin 1s linear infinite;">⏳</div>
            <p style="margin-top: 1rem; color: #7F8C8D;">Generating your personalized quiz...</p>
        </div>
    `;

    try {
        // Call quiz generation API
        const response = await makeAPIRequest(
            API_CONFIG.ROUTES.GENERATE_QUIZ,
            'POST',
            {
                studentId: STUDENT_DATA.studentId,
                subject: subject,
                topic: topic,
                difficulty: STUDENT_DATA.currentDifficulty,
                questionCount: 5
            }
        );

        if (response.success && response.quiz) {
            currentQuiz = response.quiz;
            currentQuiz.quizId = response.quizId;
            currentQuiz.subject = subject;
            currentQuiz.topic = topic;

            // Initialize student answers array
            studentAnswers = new Array(currentQuiz.questions.length).fill(null);

            // Display the quiz
            displayQuiz(currentQuiz);
        } else {
            throw new Error(response.error || 'Failed to generate quiz');
        }

    } catch (error) {
        console.error('Quiz generation error:', error);
        quizContainer.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> Failed to generate quiz. ${error.message}
                <br><br>
                <a href="../student-dashboard.html" class="btn btn-secondary">← Back to Dashboard</a>
            </div>
        `;
    }
}

/**
 * Display generated quiz questions
 */
function displayQuiz(quiz) {
    const quizContainer = document.getElementById('quizForm');

    // Update quiz header
    document.querySelector('.card h2').textContent = `📝 ${quiz.topic} Quiz`;
    document.querySelector('.card p').textContent =
        `${quiz.questions.length} Questions | AI-Generated at ${quiz.difficulty || 'Medium'} Level`;

    // Generate question HTML
    const questionsHTML = quiz.questions.map((q, index) => {
        const questionNumber = index + 1;
        const questionId = `q${questionNumber}`;

        return `
            <div class="question-card">
                <div style="display: flex; align-items: center; margin-bottom: 1rem;">
                    <span class="question-number">${questionNumber}</span>
                    <span class="question-text">${q.question}</span>
                </div>
                ${q.options.map((option, optIndex) => `
                    <label class="option">
                        <input type="radio" name="${questionId}" value="${optIndex}"
                               onchange="recordAnswer(${index}, ${optIndex})">
                        <span>${String.fromCharCode(65 + optIndex)}) ${option}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }).join('');

    // Update container
    quizContainer.innerHTML = `
        ${questionsHTML}

        <!-- Submit Button -->
        <div style="text-align: center; margin-top: 2rem;">
            <button onclick="submitQuiz()" class="btn btn-success" style="padding: 1rem 3rem; font-size: 1.1rem;">
                Submit Quiz 🚀
            </button>
        </div>
    `;

    // Add click handlers to options
    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;

            // Trigger the onchange event
            radio.dispatchEvent(new Event('change'));

            // Remove selected class from siblings
            this.parentElement.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });

            // Add selected class
            this.classList.add('selected');
        });
    });
}

/**
 * Record student's answer
 */
function recordAnswer(questionIndex, answerIndex) {
    studentAnswers[questionIndex] = answerIndex;
    console.log('Answer recorded:', { questionIndex, answerIndex });
}

/**
 * Submit quiz to backend for evaluation
 */
async function submitQuiz() {
    // Check if all questions answered
    if (studentAnswers.includes(null) || studentAnswers.length !== currentQuiz.questions.length) {
        alert('Please answer all questions before submitting!');
        return;
    }

    console.log('Submitting quiz:', {
        quizId: currentQuiz.quizId,
        answers: studentAnswers
    });

    // Show loading state
    const submitBtn = document.querySelector('.btn-success');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Evaluating...';

    try {
        // Submit to quiz evaluator API
        const response = await makeAPIRequest(
            API_CONFIG.ROUTES.SUBMIT_QUIZ || '/student/quiz/submit',
            'POST',
            {
                studentId: STUDENT_DATA.studentId,
                quizId: currentQuiz.quizId,
                subject: currentQuiz.subject,
                topic: currentQuiz.topic,
                answers: studentAnswers,
                correctAnswers: currentQuiz.correctAnswers || currentQuiz.questions.map(q => q.correctAnswer),
                questions: currentQuiz.questions
            }
        );

        if (response.success && response.result) {
            // Display results
            displayResults(response.result);

            // Hide quiz form
            document.getElementById('quizForm').style.display = 'none';

            // Show results section
            document.getElementById('resultsSection').style.display = 'block';

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } else {
            throw new Error(response.error || 'Failed to evaluate quiz');
        }

    } catch (error) {
        console.error('Quiz submission error:', error);
        alert(`Failed to submit quiz: ${error.message}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Display quiz results from backend evaluation
 */
function displayResults(result) {
    const { correctAnswers, totalQuestions, percentage, answers, passed } = result;

    // Update score display
    document.getElementById('scoreCircle').textContent = `${correctAnswers}/${totalQuestions}`;

    // Update feedback
    let feedback = '';
    let grade = '';
    let difficultyMessage = '';

    if (percentage >= 90) {
        grade = 'A';
        feedback = 'Excellent work! You have mastered this topic! 🌟';
        difficultyMessage = 'Your next lesson will be at <span class="difficulty-badge difficulty-hard">Hard Level</span> to challenge you further.';
    } else if (percentage >= 80) {
        grade = 'B';
        feedback = `Great work! You scored ${percentage}%`;
        difficultyMessage = 'Your next lesson will remain at <span class="difficulty-badge difficulty-medium">Medium Level</span>.';
    } else if (percentage >= 70) {
        grade = 'C';
        feedback = `Good effort! You scored ${percentage}%`;
        difficultyMessage = 'Your next lesson will remain at <span class="difficulty-badge difficulty-medium">Medium Level</span>.';
    } else if (percentage >= 60) {
        grade = 'D';
        feedback = 'You passed, but consider reviewing the material.';
        difficultyMessage = 'Your next lesson will be at <span class="difficulty-badge difficulty-easy">Easy Level</span> to reinforce fundamentals.';
    } else {
        grade = 'F';
        feedback = 'Don\'t worry! Let\'s review and try again.';
        difficultyMessage = 'Your next lesson will be at <span class="difficulty-badge difficulty-easy">Easy Level</span> with simplified explanations.';
    }

    document.getElementById('scoreFeedback').textContent = feedback;
    document.getElementById('gradeDisplay').innerHTML =
        `Grade: <strong style="color: ${passed ? 'var(--success-color)' : 'var(--warning-color)'};">${grade}</strong>`;

    document.getElementById('difficultyNotice').innerHTML = `
        <strong>📊 Difficulty Adjustment:</strong><br>
        Based on your performance (${percentage}%), ${difficultyMessage}
    `;

    // Display detailed results
    const detailedResultsHTML = answers.map((answer, index) => {
        const statusIcon = answer.isCorrect ? '✓' : '✗';
        const statusClass = answer.isCorrect ? 'success' : 'danger';

        return `
            <div style="padding: 1rem; border-left: 4px solid var(--${statusClass}-color);
                        background: rgba(${answer.isCorrect ? '39, 174, 96' : '231, 76, 60'}, 0.05);
                        margin-bottom: 1rem; border-radius: 4px;">
                <strong>${statusIcon} Question ${answer.questionNumber}</strong><br>
                <em style="color: #34495E;">${answer.question}</em><br>
                Your answer: <strong>${currentQuiz.questions[index].options[answer.studentAnswer]}</strong><br>
                Correct answer: <strong>${currentQuiz.questions[index].options[answer.correctAnswer]}</strong>
                <p style="margin-top: 0.5rem; color: #7F8C8D; font-size: 0.9rem;">
                    ${answer.explanation || 'No explanation available.'}
                </p>
            </div>
        `;
    }).join('');

    document.getElementById('detailedResults').innerHTML = detailedResultsHTML;
}

// Initialize quiz when page loads
document.addEventListener('DOMContentLoaded', initializeQuiz);

// Export functions for global access
window.recordAnswer = recordAnswer;
window.submitQuiz = submitQuiz;
