/**
 * SmartTutor Teacher Dashboard - API Integration
 * Handles backend calls to AWS Bedrock via API Gateway
 */

// Teacher dashboard state
let currentLessonPlan = null;
let isGenerating = false;

/**
 * Initialize teacher dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Teacher Dashboard API Integration loaded');

    // Check API configuration status
    checkAPIStatus();

    // Set up event listeners for regenerate button
    setupRegenerateButton();

    // Load initial lesson plan (if available)
    loadCurrentLessonPlan();

    // Initialize quiz results display
    initializeQuizResults();
});

/**
 * Check API configuration status and display message
 */
function checkAPIStatus() {
    const statusElement = document.getElementById('api-status');
    if (!statusElement) return;

    if (isAPIConfigured()) {
        statusElement.innerHTML = `
            <div class="alert alert-success">
                <strong>Connected to AWS Backend</strong>
                <br>Lesson plans will be generated using Amazon Bedrock (Claude 3 Sonnet)
            </div>
        `;
    } else {
        statusElement.innerHTML = `
            <div class="alert alert-warning">
                <strong>Using Mock Data</strong>
                <br>Backend not configured. To connect to AWS:
                <ol style="margin: 0.5rem 0 0 1.5rem; font-size: 0.9rem;">
                    <li>Run: <code>./backend/deploy_backend.sh</code></li>
                    <li>Update <code>ui-prototype/js/api-config.js</code> with your API endpoint</li>
                    <li>Set <code>USE_MOCK_DATA = false</code></li>
                </ol>
            </div>
        `;
    }
}

/**
 * Set up regenerate button event listener
 */
function setupRegenerateButton() {
    const regenerateBtn = document.getElementById('regenerate-plan-btn');
    if (!regenerateBtn) {
        console.error('Regenerate button not found');
        return;
    }

    regenerateBtn.addEventListener('click', async function(event) {
        event.preventDefault();
        try {
            await regenerateLessonPlan();
        } catch (err) {
            console.error('Error in regenerate button handler:', err);
        }
    });

    console.log('Regenerate button listener attached');
}

/**
 * Regenerate lesson plan - Main function called when teacher clicks button
 */
async function regenerateLessonPlan() {
    if (isGenerating) {
        console.log('Generation already in progress');
        return;
    }

    try {
        isGenerating = true;

        // Show loading state
        showLoadingState();

        // Gather current class data
        const requestData = gatherClassData();

        console.log('Requesting lesson plan generation:', requestData);

        // Make API call to backend
        const response = await makeAPIRequest(
            API_CONFIG.ROUTES.GENERATE_LESSON_PLAN,
            'POST',
            requestData
        );

        if (response.success && response.lessonPlan) {
            currentLessonPlan = response.lessonPlan;

            // Display the new lesson plan
            displayLessonPlan(response.lessonPlan);

            // Show success notification
            showNotification('success', 'Lesson Plan Generated!',
                isAPIConfigured()
                    ? 'New weekly lesson plan generated using Amazon Bedrock'
                    : 'Mock lesson plan generated (AWS not connected)'
            );

        } else {
            throw new Error('Failed to generate lesson plan');
        }

    } catch (error) {
        console.error('Error generating lesson plan:', error);

        // Show error notification
        showNotification('error', 'Generation Failed',
            'Failed to generate lesson plan. ' + error.message
        );

        // Hide loading state
        hideLoadingState();

    } finally {
        isGenerating = false;
    }
}

/**
 * Gather current class data for lesson plan generation
 */
function gatherClassData() {
    // In a real application, this would fetch actual class data
    // For now, using sample data that matches the dashboard display

    return {
        teacherId: 'teacher_001',
        classId: 'class_8A',
        subject: 'Biology',  // Could be dynamic based on dropdown
        weekStartDate: getNextMonday(),
        studentData: {
            totalStudents: 25,
            weakTopics: ['Photosynthesis', 'Cell Division', 'Genetics'],
            averagePerformance: 72.5,
            difficultyDistribution: {
                easy: 8,
                medium: 12,
                hard: 5
            }
        }
    };
}

/**
 * Get next Monday's date in YYYY-MM-DD format
 */
function getNextMonday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
}

/**
 * Display generated lesson plan in the UI
 */
function displayLessonPlan(lessonPlan) {
    const container = document.getElementById('lesson-plan-container');
    if (!container) {
        console.error('Lesson plan container not found');
        return;
    }

    // Build HTML for lesson plan
    let html = `
        <div class="lesson-plan-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
            <h2 style="margin: 0 0 0.5rem 0;">Weekly Lesson Plan</h2>
            <p style="margin: 0; opacity: 0.9;"><strong>${lessonPlan.subject}</strong> | Week of ${lessonPlan.weekStartDate || 'Next Week'}</p>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                ${isAPIConfigured()
                    ? '<span style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 20px;">Generated by Amazon Bedrock (Claude 3 Sonnet)</span>'
                    : '<span style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 20px;">Mock Data (AWS not configured)</span>'
                }
            </p>
        </div>

        <div class="card">
            <h3>Week Overview</h3>
            <p>${lessonPlan.weekOverview}</p>
        </div>

        <div class="card">
            <h3>Weekly Goals</h3>
            <ul>
                ${lessonPlan.weeklyGoals.map(goal => `<li>${goal}</li>`).join('')}
            </ul>
        </div>

        <div class="card">
            <h3>Daily Lesson Plans</h3>
            <div class="daily-lessons">
    `;

    // Add each day's lesson
    lessonPlan.dailyLessons.forEach((lesson, index) => {
        html += `
            <div class="daily-lesson-card" style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #667eea;">
                <h4 style="color: #667eea; margin-top: 0;">
                    ${lesson.day} - ${lesson.date}
                </h4>
                <p style="font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0;">
                    Topic: ${lesson.topic}
                </p>

                <div style="margin-top: 1rem;">
                    <strong>Learning Objectives:</strong>
                    <ul style="margin: 0.5rem 0;">
                        ${lesson.learningObjectives.map(obj => `<li>${obj}</li>`).join('')}
                    </ul>
                </div>

                <div style="margin-top: 1rem;">
                    <strong>Activities:</strong>
                    <table class="table" style="margin-top: 0.5rem;">
                        <thead>
                            <tr>
                                <th style="width: 80px;">Time</th>
                                <th>Activity</th>
                                <th style="width: 120px;">Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lesson.activities.map(act => `
                                <tr>
                                    <td>${act.time}</td>
                                    <td>${act.activity}</td>
                                    <td>
                                        <span class="difficulty-badge difficulty-${act.difficulty === 'all' ? 'medium' : act.difficulty}">
                                            ${act.difficulty}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 1rem; background: white; padding: 1rem; border-radius: 6px;">
                    <strong>Differentiation:</strong>
                    <div style="margin-top: 0.5rem; display: grid; gap: 0.5rem;">
                        <div>
                            <span class="difficulty-badge difficulty-easy">Easy</span>
                            <span style="margin-left: 0.5rem;">${lesson.differentiation.easy}</span>
                        </div>
                        <div>
                            <span class="difficulty-badge difficulty-medium">Medium</span>
                            <span style="margin-left: 0.5rem;">${lesson.differentiation.medium}</span>
                        </div>
                        <div>
                            <span class="difficulty-badge difficulty-hard">Hard</span>
                            <span style="margin-left: 0.5rem;">${lesson.differentiation.hard}</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <strong>Assessment:</strong> ${lesson.assessment}
                    </div>
                    <div>
                        <strong>Homework:</strong> ${lesson.homework}
                    </div>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>

        <div class="card">
            <h3>Required Materials</h3>
            <ul>
                ${lessonPlan.materials.map(material => `<li>${material}</li>`).join('')}
            </ul>
        </div>

        <div class="card" style="background: rgba(255, 193, 7, 0.1); border-left: 4px solid #FFC107;">
            <h3>Teacher Notes</h3>
            <p>${lessonPlan.notes}</p>
        </div>

        <div style="margin-top: 2rem; text-align: center; padding: 1.5rem; background: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 1rem 0; color: #7F8C8D;">
                Generated at: ${new Date(lessonPlan.generatedAt).toLocaleString()}
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-success" onclick="approveLessonPlan()">
                    Approve Plan
                </button>
                <button class="btn btn-primary" onclick="editLessonPlan()">
                    Edit Plan
                </button>
                <button class="btn btn-warning" onclick="regenerateLessonPlan()">
                    Regenerate
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Hide loading state
    hideLoadingState();
}

/**
 * Show loading state during generation
 */
function showLoadingState() {
    const container = document.getElementById('lesson-plan-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem;">
            <div class="spinner" style="margin: 0 auto 1rem;"></div>
            <h3 style="color: #667eea; margin-bottom: 0.5rem;">
                ${isAPIConfigured() ? 'Generating Lesson Plan with Amazon Bedrock...' : 'Generating Mock Lesson Plan...'}
            </h3>
            <p style="color: #7F8C8D;">
                ${isAPIConfigured()
                    ? 'Claude 3 Sonnet is analyzing your class data and creating a personalized weekly plan...'
                    : 'Creating a sample lesson plan (AWS not configured)...'
                }
            </p>
            <div style="margin-top: 2rem; max-width: 500px; margin-left: auto; margin-right: auto; text-align: left;">
                <div class="progress-steps">
                    <div class="step active">Analyzing student performance...</div>
                    <div class="step">Identifying learning objectives...</div>
                    <div class="step">Structuring daily activities...</div>
                    <div class="step">Adding differentiation strategies...</div>
                </div>
            </div>
        </div>
    `;

    // Animate progress steps
    let stepIndex = 0;
    const steps = container.querySelectorAll('.step');
    const interval = setInterval(() => {
        if (stepIndex < steps.length) {
            steps[stepIndex].classList.add('active');
            stepIndex++;
        }
    }, 800);

    // Store interval ID as a number
    container.dataset.loadingInterval = interval.toString();
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    const container = document.getElementById('lesson-plan-container');
    if (!container) return;

    // Clear loading interval if exists
    if (container.dataset.loadingInterval) {
        clearInterval(Number(container.dataset.loadingInterval));
        delete container.dataset.loadingInterval;
    }
}

/**
 * Load current lesson plan (if available)
 */
function loadCurrentLessonPlan() {
    // In a real app, this would fetch from backend
    // For demo, we'll show a message
    const container = document.getElementById('lesson-plan-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-radius: 8px;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">&#128218;</div>
            <h3 style="color: #667eea; margin-bottom: 1rem;">No Lesson Plan Generated Yet</h3>
            <p style="color: #7F8C8D; margin-bottom: 2rem;">
                Click the "Regenerate Plan" button to create a new AI-powered weekly lesson plan
                ${isAPIConfigured() ? 'using Amazon Bedrock.' : '(currently using mock data - AWS not configured).'}
            </p>
            <button class="btn btn-primary" onclick="regenerateLessonPlan()" style="padding: 1rem 2rem; font-size: 1.1rem;">
                Generate Lesson Plan with AI
            </button>
        </div>
    `;
}

/**
 * Show notification to user
 */
function showNotification(type, title, message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 1rem;">
            <div style="font-size: 1.5rem;">${type === 'success' ? '&#10003;' : '&#10007;'}</div>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 0.25rem;">${title}</strong>
                <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0; line-height: 1;">&#10005;</button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Approve lesson plan
 */
function approveLessonPlan() {
    if (!currentLessonPlan) return;

    showNotification('success', 'Plan Approved!',
        'Lesson plan has been approved and is now ready for use.');

    // In real app, would save to backend with status='approved'
    console.log('Lesson plan approved:', currentLessonPlan);
}

/**
 * Edit lesson plan
 */
function editLessonPlan() {
    if (!currentLessonPlan) return;

    showNotification('info', 'Edit Mode',
        'Edit functionality would open an editor interface here.');

    // In real app, would open edit interface
    console.log('Edit lesson plan:', currentLessonPlan);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }

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

    .progress-steps {
        text-align: left;
    }

    .progress-steps .step {
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        border-radius: 6px;
        background: rgba(102, 126, 234, 0.1);
        opacity: 0.4;
        transition: all 0.3s ease;
    }

    .progress-steps .step.active {
        opacity: 1;
        background: rgba(102, 126, 234, 0.2);
        font-weight: 600;
    }

    .daily-lesson-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .daily-lesson-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
`;
document.head.appendChild(style);

/**
 * Fetch student quiz results from backend
 */
async function fetchQuizResults(studentId = null, subject = null, limit = 50) {
    try {
        // Build query parameters
        const params = new URLSearchParams();
        if (studentId) params.append('studentId', studentId);
        if (subject) params.append('subject', subject);
        params.append('limit', limit.toString());

        const endpoint = '/teacher/quiz/results';
        const url = `${endpoint}?${params.toString()}`;

        console.log('Fetching quiz results:', url);

        const response = await makeAPIRequest(url, 'GET');

        if (response.success) {
            return {
                results: response.results || [],
                statistics: response.statistics || {},
                count: response.count || 0
            };
        } else {
            throw new Error(response.error || 'Failed to fetch quiz results');
        }

    } catch (error) {
        console.error('Error fetching quiz results:', error);
        return {
            results: [],
            statistics: {},
            count: 0,
            error: error.message
        };
    }
}

/**
 * Display quiz results in the dashboard
 */
async function displayQuizResults(containerId = 'quizResultsContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Quiz results container not found');
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 2rem;">⏳</div>
            <p>Loading quiz results...</p>
        </div>
    `;

    // Fetch results
    const { results, statistics, count, error } = await fetchQuizResults();

    if (error) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <strong>Error:</strong> ${error}
            </div>
        `;
        return;
    }

    if (count === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <strong>No quiz results yet</strong>
                <br>Students haven't submitted any quizzes yet. Results will appear here once students complete their quizzes.
            </div>
        `;
        return;
    }

    // Display statistics
    const statsHTML = `
        <div class="stats-grid" style="margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-value">${statistics.totalQuizzes || 0}</div>
                <div class="stat-label">Total Quizzes</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.averageScore || 0}%</div>
                <div class="stat-label">Average Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.passRate || 0}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${statistics.totalStudents || 0}</div>
                <div class="stat-label">Students</div>
            </div>
        </div>
    `;

    // Display recent results table
    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Status</th>
                    <th>Submitted</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td><strong>${result.studentId}</strong></td>
                        <td>${result.subject}</td>
                        <td>${result.topic}</td>
                        <td>${result.correctAnswers}/${result.totalQuestions}</td>
                        <td>
                            <span style="color: ${result.passed ? 'var(--success-color)' : 'var(--danger-color)'};">
                                ${result.percentage}%
                            </span>
                        </td>
                        <td>
                            ${result.passed
                                ? '<span style="color: var(--success-color);">✓ Passed</span>'
                                : '<span style="color: var(--danger-color);">✗ Failed</span>'}
                        </td>
                        <td>${new Date(result.submittedAt).toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = statsHTML + tableHTML;
}

/**
 * Initialize quiz results display on page load
 */
function initializeQuizResults() {
    // Auto-refresh quiz results every 30 seconds
    displayQuizResults();
    setInterval(() => displayQuizResults(), 30000);
}

// Export functions for use in HTML
window.regenerateLessonPlan = regenerateLessonPlan;
window.approveLessonPlan = approveLessonPlan;
window.editLessonPlan = editLessonPlan;
window.fetchQuizResults = fetchQuizResults;
window.displayQuizResults = displayQuizResults;
window.initializeQuizResults = initializeQuizResults;
