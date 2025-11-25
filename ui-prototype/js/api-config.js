/**
 * SmartTutor API Configuration
 * Connects frontend (Layer 1) to backend GenAI Processing Pipeline (Layer 2)
 */

// Student Data (shared across pages)
// In production, this would be fetched from backend based on logged-in user
const STUDENT_DATA = {
    studentId: 'student_001',
    name: 'John Doe',
    currentDifficulty: 'medium',
    lessonsCompleted: 12,
    averageScore: 85
};

// API Configuration
const API_CONFIG = {
     API_ENDPOINT: 'https://ojbjxbk9bg.execute-api.us-east-1.amazonaws.com/prod',


    // API Routes
    ROUTES: {
        GENERATE_LESSON_PLAN: '/teacher/lesson-plan/generate',
        GET_LESSON_PLAN: '/teacher/lesson-plan/get',
        GENERATE_LESSON: '/student/lesson/generate',
        GENERATE_QUIZ: '/student/quiz/generate',
        CHAT_TUTOR: '/student/chat',
        SUBMIT_QUIZ: '/student/quiz/submit',
        GET_QUIZ_RESULTS: '/teacher/quiz/results'
    },

    // Request configuration
    REQUEST_TIMEOUT: 30000,  // 30 seconds
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000,  // 1 second

    // Development mode - uses mock data if API is not configured
    USE_MOCK_DATA: false  // Set to false after deployment
};

/**
 * Check if API is configured
 */
function isAPIConfigured() {
    return API_CONFIG.API_ENDPOINT !== 'UPDATE_AFTER_DEPLOYMENT' &&
           API_CONFIG.API_ENDPOINT.startsWith('https://');
}

/**
 * Make API request with error handling and retries
 */
async function makeAPIRequest(endpoint, method = 'POST', data = null, retries = API_CONFIG.RETRY_ATTEMPTS) {
    // If API not configured and mock data is enabled, return mock response
    if (API_CONFIG.USE_MOCK_DATA && !isAPIConfigured()) {
        console.warn('API not configured. Using mock data.');
        return getMockResponse(endpoint, data);
    }

    const url = `${API_CONFIG.API_ENDPOINT}${endpoint}`;

    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors'
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        console.log(`Making ${method} request to: ${url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT);

        options.signal = controller.signal;

        const response = await fetch(url, options);
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('API Response:', result);

        return result;

    } catch (error) {
        console.error('API Error:', error);

        // Retry logic
        if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
            console.log(`Retrying... (${API_CONFIG.RETRY_ATTEMPTS - retries + 1}/${API_CONFIG.RETRY_ATTEMPTS})`);
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
            return makeAPIRequest(endpoint, method, data, retries - 1);
        }

        // If all retries failed and mock data is enabled, fall back to mock
        if (API_CONFIG.USE_MOCK_DATA) {
            console.warn('API failed. Falling back to mock data.');
            return getMockResponse(endpoint, data);
        }

        throw error;
    }
}

/**
 * Mock responses for development/testing
 */
function getMockResponse(endpoint, requestData) {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            if (endpoint === API_CONFIG.ROUTES.GENERATE_LESSON_PLAN) {
                resolve(getMockLesson_Plan(requestData));
            } else if (endpoint === API_CONFIG.ROUTES.GENERATE_LESSON) {
                resolve(getMockLesson(requestData));
            } else if (endpoint === API_CONFIG.ROUTES.GENERATE_QUIZ) {
                resolve(getMockQuiz(requestData));
            } else if (endpoint === API_CONFIG.ROUTES.SUBMIT_QUIZ) {
                resolve(getMockQuizSubmission(requestData));
            } else {
                resolve({ success: true, message: 'Mock response', data: {} });
            }
        }, 1500); // 1.5 second delay to simulate API call
    });
}

/**
 * Get mock lesson plan (fallback when API unavailable)
 */
function getMockLesson_Plan(requestData) {
    const subject = requestData?.subject || 'Biology';
    const weekDays = ['Monday, November 25', 'Tuesday, November 26', 'Wednesday, November 27', 'Thursday, November 28', 'Friday, November 29'];

    return {
        success: true,
        planId: `mock_plan_${Date.now()}`,
        lessonPlan: {
            weekOverview: `This week in ${subject}, students will focus on core concepts and address identified weak areas through differentiated instruction.`,
            weeklyGoals: [
                'Strengthen understanding of fundamental concepts',
                'Build confidence through varied practice activities',
                'Prepare students for upcoming assessments'
            ],
            dailyLessons: [
                {
                    day: 'Monday',
                    date: weekDays[0],
                    topic: `Introduction to ${subject} Concepts`,
                    learningObjectives: [
                        'Review prerequisite knowledge',
                        'Introduce new concepts with clear examples'
                    ],
                    activities: [
                        { time: '10 min', activity: 'Warm-up and prior knowledge check', difficulty: 'all' },
                        { time: '25 min', activity: 'Direct instruction with visual aids', difficulty: 'medium' },
                        { time: '15 min', activity: 'Guided practice in groups', difficulty: 'differentiated' }
                    ],
                    differentiation: {
                        easy: 'Provide step-by-step guides and extra examples',
                        medium: 'Standard instruction with peer collaboration',
                        hard: 'Challenge problems and independent exploration'
                    },
                    assessment: 'Exit ticket with 3 quick check questions',
                    homework: 'Practice worksheet (differentiated by level)'
                },
                {
                    day: 'Tuesday',
                    date: weekDays[1],
                    topic: 'Application and Practice',
                    learningObjectives: [
                        'Apply concepts to real-world scenarios',
                        'Develop problem-solving strategies'
                    ],
                    activities: [
                        { time: '10 min', activity: 'Review and Q&A', difficulty: 'all' },
                        { time: '25 min', activity: 'Hands-on activity or lab', difficulty: 'differentiated' },
                        { time: '15 min', activity: 'Group problem solving', difficulty: 'differentiated' }
                    ],
                    differentiation: {
                        easy: 'Structured worksheets with guidance',
                        medium: 'Semi-structured group work',
                        hard: 'Open-ended investigation tasks'
                    },
                    assessment: 'Group presentations or posters',
                    homework: 'Reflection journal on today\'s activity'
                },
                {
                    day: 'Wednesday',
                    date: weekDays[2],
                    topic: 'Skill Building and Consolidation',
                    learningObjectives: [
                        'Master key skills through practice',
                        'Identify and correct common errors'
                    ],
                    activities: [
                        { time: '10 min', activity: 'Review game or quiz', difficulty: 'all' },
                        { time: '25 min', activity: 'Learning stations', difficulty: 'differentiated' },
                        { time: '15 min', activity: 'Independent practice', difficulty: 'differentiated' }
                    ],
                    differentiation: {
                        easy: 'Foundational skill practice with support',
                        medium: 'Mixed difficulty problems',
                        hard: 'Complex multi-step challenges'
                    },
                    assessment: 'Formative quiz (5-10 questions)',
                    homework: 'Error analysis from quiz'
                },
                {
                    day: 'Thursday',
                    date: weekDays[3],
                    topic: 'Extension and Connections',
                    learningObjectives: [
                        'Connect concepts across topics',
                        'Explore advanced applications'
                    ],
                    activities: [
                        { time: '10 min', activity: 'Cross-curricular connection', difficulty: 'all' },
                        { time: '25 min', activity: 'Project work', difficulty: 'differentiated' },
                        { time: '15 min', activity: 'Peer teaching and sharing', difficulty: 'all' }
                    ],
                    differentiation: {
                        easy: 'Guided project with templates',
                        medium: 'Semi-independent project work',
                        hard: 'Research-based deep dive project'
                    },
                    assessment: 'Project check-in and peer feedback',
                    homework: 'Continue project work'
                },
                {
                    day: 'Friday',
                    date: weekDays[4],
                    topic: 'Assessment and Reflection',
                    learningObjectives: [
                        'Demonstrate mastery of weekly content',
                        'Reflect on learning and set goals'
                    ],
                    activities: [
                        { time: '30 min', activity: 'Weekly assessment', difficulty: 'differentiated' },
                        { time: '15 min', activity: 'Self-reflection and goal setting', difficulty: 'all' },
                        { time: '5 min', activity: 'Preview next week', difficulty: 'all' }
                    ],
                    differentiation: {
                        easy: 'Modified assessment with support',
                        medium: 'Standard assessment',
                        hard: 'Extended response questions'
                    },
                    assessment: 'Weekly summative assessment',
                    homework: 'Weekend review and preparation'
                }
            ],
            materials: [
                'Textbook and workbook',
                'Visual aids and diagrams',
                'Digital resources and videos',
                'Lab materials (if applicable)',
                'Assessment templates'
            ],
            notes: 'Focus on building student confidence and addressing identified weak areas.',
            subject: subject,
            generatedBy: 'Mock Data (API not configured)',
            generatedAt: new Date().toISOString()
        },
        generatedAt: new Date().toISOString(),
        message: 'Mock lesson plan generated (API not configured)'
    };
}

/**
 * Get mock lesson (for student dashboard)
 */
function getMockLesson(requestData) {
    const subject = requestData?.subject || 'Biology';
    const topic = requestData?.topic || 'Photosynthesis';
    const difficulty = requestData?.difficulty || 'medium';

    return {
        success: true,
        lessonId: `mock_lesson_${Date.now()}`,
        lesson: {
            subject: subject,
            topic: topic,
            difficulty: difficulty,
            generatedBy: 'Mock Data (API not configured)',
            generatedAt: new Date().toISOString()
        },
        message: 'Lesson content ready (using mock data)'
    };
}

/**
 * Get mock quiz (for quiz generation)
 */
function getMockQuiz(requestData) {
    const subject = requestData?.subject || 'Biology';
    const topic = requestData?.topic || 'Photosynthesis';
    const difficulty = requestData?.difficulty || 'medium';

    return {
        success: true,
        quizId: `mock_quiz_${Date.now()}`,
        quiz: {
            subject: subject,
            topic: topic,
            difficulty: difficulty,
            questions: [
                {
                    question: 'What is the primary function of chlorophyll in photosynthesis?',
                    options: [
                        'To absorb light energy',
                        'To produce oxygen',
                        'To store glucose',
                        'To transport water'
                    ],
                    correctAnswer: 0,
                    explanation: 'Chlorophyll absorbs light energy from the sun, which is essential for photosynthesis.'
                },
                {
                    question: 'Where does photosynthesis take place?',
                    options: [
                        'Mitochondria',
                        'Chloroplasts',
                        'Nucleus',
                        'Ribosomes'
                    ],
                    correctAnswer: 1,
                    explanation: 'Photosynthesis occurs in chloroplasts, which contain chlorophyll.'
                }
            ],
            generatedBy: 'Mock Data (API not configured)',
            generatedAt: new Date().toISOString()
        },
        message: 'Quiz generated (using mock data)'
    };
}

/**
 * Get mock quiz submission result (for quiz evaluation)
 */
function getMockQuizSubmission(requestData) {
    const studentAnswers = requestData?.answers || [];
    const correctAnswers = requestData?.correctAnswers || [];
    const questions = requestData?.questions || [];

    // Evaluate the quiz
    let correctCount = 0;
    const detailedAnswers = [];

    for (let i = 0; i < studentAnswers.length; i++) {
        const isCorrect = studentAnswers[i] === correctAnswers[i];
        if (isCorrect) correctCount++;

        detailedAnswers.push({
            questionNumber: i + 1,
            question: questions[i]?.question || '',
            studentAnswer: studentAnswers[i],
            correctAnswer: correctAnswers[i],
            isCorrect: isCorrect,
            explanation: questions[i]?.explanation || 'No explanation available.'
        });
    }

    const totalQuestions = studentAnswers.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = percentage >= 70;

    const resultId = `mock_result_${Date.now()}`;

    return {
        success: true,
        resultId: resultId,
        result: {
            resultId: resultId,
            studentId: requestData?.studentId || 'student_001',
            quizId: requestData?.quizId || 'unknown',
            subject: requestData?.subject || 'Unknown',
            topic: requestData?.topic || 'Unknown',
            totalQuestions: totalQuestions,
            correctAnswers: correctCount,
            incorrectAnswers: totalQuestions - correctCount,
            score: `${correctCount}/${totalQuestions}`,
            percentage: percentage,
            answers: detailedAnswers,
            submittedAt: new Date().toISOString(),
            passed: passed
        },
        message: `Quiz evaluated: ${correctCount}/${totalQuestions} correct (using mock evaluation)`
    };
}

// Export for use in other scripts
window.STUDENT_DATA = STUDENT_DATA;
window.API_CONFIG = API_CONFIG;
window.makeAPIRequest = makeAPIRequest;
window.isAPIConfigured = isAPIConfigured;
