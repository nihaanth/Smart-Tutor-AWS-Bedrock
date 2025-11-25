/**
 * SmartTutor Student Dashboard - Backend Integration
 * Connects student features to AWS Bedrock API
 */

// Wrap in IIFE to avoid polluting global scope and catch errors
(function() {
    'use strict';

// Student data (in production, this would be fetched from backend)
const STUDENT_DATA = {
    studentId: 'student_001',
    name: 'John Doe',
    currentDifficulty: 'medium',
    lessonsCompleted: 12,
    averageScore: 85
};

/**
 * Initialize student dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('SmartTutor Student Dashboard loaded');

    // Check API connection status
    checkAPIConnection();

    // Add hover effects to topic cards
    setupTopicCardEffects();

    // Track page view
    trackActivity('page_view', { page: 'student_dashboard' });
});

/**
 * Check API connection and show status
 */
function checkAPIConnection() {
    if (typeof isAPIConfigured === 'function') {
        const isConnected = isAPIConfigured();
        console.log('API Connection Status:', isConnected ? 'Connected to AWS' : 'Using mock data');

        // Could show a small indicator in the UI if needed
        if (!isConnected && API_CONFIG.USE_MOCK_DATA) {
            console.log('Backend not configured. Using mock data for demo.');
        }
    }
}

/**
 * Topic selection handler - Now with backend integration
 */
function selectTopic(subject, topic) {
    console.log(`Selected: ${subject} - ${topic}`);

    // Show loading indicator
    const loadingDiv = createLoadingOverlay(subject, topic);
    document.body.appendChild(loadingDiv);

    // Check if we should use backend or just navigate
    if (typeof makeAPIRequest === 'function' && (isAPIConfigured() || API_CONFIG.USE_MOCK_DATA)) {
        // Generate personalized lesson via backend
        generatePersonalizedLesson(subject, topic, loadingDiv);
    } else {
        // Fallback: Just navigate to lesson page
        setTimeout(() => {
            window.location.href = `pages/lesson.html?subject=${subject}&topic=${topic}`;
        }, 1500);
    }
}

/**
 * Generate personalized lesson using AWS Bedrock
 */
async function generatePersonalizedLesson(subject, topic, loadingDiv) {
    try {
        // Prepare request data
        const requestData = {
            studentId: STUDENT_DATA.studentId,
            subject: subject,
            topic: topic,
            difficulty: STUDENT_DATA.currentDifficulty,
            studentPerformance: {
                lessonsCompleted: STUDENT_DATA.lessonsCompleted,
                averageScore: STUDENT_DATA.averageScore
            }
        };

        console.log('Requesting personalized lesson:', requestData);

        // Make API call to backend
        const response = await makeAPIRequest(
            API_CONFIG.ROUTES.GENERATE_LESSON,
            'POST',
            requestData
        );

        if (response.success) {
            console.log('Lesson generated successfully');

            // Track activity
            trackActivity('lesson_generated', {
                subject: subject,
                topic: topic,
                usedBackend: isAPIConfigured()
            });

            // Navigate to lesson page
            window.location.href = `pages/lesson.html?subject=${subject}&topic=${topic}`;
        } else {
            throw new Error('Failed to generate lesson');
        }

    } catch (error) {
        console.error('Error generating lesson:', error);

        // Fallback: Navigate anyway with static content
        setTimeout(() => {
            window.location.href = `pages/lesson.html?subject=${subject}&topic=${topic}`;
        }, 500);
    }
}

/**
 * Create loading overlay
 */
function createLoadingOverlay(subject, topic) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'lesson-loading-overlay';
    loadingDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.7); display: flex; align-items: center;
                    justify-content: center; z-index: 1000; backdrop-filter: blur(4px);">
            <div style="background: white; padding: 3rem; border-radius: 12px; text-align: center;
                        max-width: 400px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div class="spinner" style="margin: 0 auto 1.5rem;"></div>
                <h3 style="color: #667eea; margin-bottom: 0.5rem;">
                    ${isAPIConfigured() ? 'Generating Personalized Lesson' : 'Preparing Lesson'}
                </h3>
                <p style="color: #7F8C8D; margin: 0.5rem 0;">
                    <strong>${subject}</strong> - ${topic}
                </p>
                <p style="color: #95a5a6; font-size: 0.9rem; margin-top: 1rem;">
                    ${isAPIConfigured()
                        ? 'Amazon Bedrock is customizing content for your skill level...'
                        : 'Loading lesson content...'}
                </p>
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #ecf0f1;">
                    <div class="progress-indicator">
                        <div class="step">Analyzing your performance</div>
                        <div class="step">Selecting appropriate difficulty</div>
                        <div class="step">Preparing content</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Animate progress steps
    setTimeout(() => {
        const steps = loadingDiv.querySelectorAll('.step');
        steps.forEach((step, index) => {
            setTimeout(() => {
                step.style.opacity = '1';
                step.style.color = '#667eea';
            }, index * 600);
        });
    }, 100);

    return loadingDiv;
}

/**
 * Setup hover effects for topic cards
 */
function setupTopicCardEffects() {
    const topicCards = document.querySelectorAll('.topic-card');
    topicCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Handle quiz start
 */
function startQuiz(topic) {
    // Track activity
    trackActivity('quiz_started', { topic: topic });

    // Navigate to quiz page
    window.location.href = `pages/quiz.html?topic=${topic}`;
}

/**
 * Open chat tutor
 */
function openChat() {
    // Track activity
    trackActivity('chat_opened', {});

    // Navigate to chat page
    window.location.href = 'pages/chat-tutor.html';
}

/**
 * Track student activity
 */
function trackActivity(activityType, details) {
    const activity = {
        type: activityType,
        details: details,
        timestamp: new Date().toISOString(),
        studentId: STUDENT_DATA.studentId
    };

    console.log('Activity tracked:', activity);

    // In production, send to backend analytics
    if (typeof makeAPIRequest === 'function' && isAPIConfigured()) {
        // Could send analytics to backend
        // makeAPIRequest('/student/track-activity', 'POST', activity);
    }
}

// Export functions for HTML onclick handlers FIRST (before any DOM manipulation)
window.selectTopic = selectTopic;
window.startQuiz = startQuiz;
window.openChat = openChat;

// Add CSS for loading overlay animations
const style = document.createElement('style');
style.textContent = `
    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .progress-indicator {
        text-align: left;
    }

    .progress-indicator .step {
        padding: 0.5rem 0;
        font-size: 0.85rem;
        color: #bdc3c7;
        opacity: 0.3;
        transition: all 0.3s ease;
    }

    .topic-card {
        transition: all 0.3s ease;
        cursor: pointer;
    }

    .topic-card:hover {
        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
`;

// Safely append style to head
if (document.head) {
    document.head.appendChild(style);
} else {
    // Fallback: wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        document.head.appendChild(style);
    });
}

})(); // End of IIFE

console.log('student-dashboard.js loaded, selectTopic available:', typeof window.selectTopic);
