/**
 * SmartTutor API Configuration
 * Connects frontend (Layer 1) to backend GenAI Processing Pipeline (Layer 2)
 */

// Student Data (shared across pages)
// Dynamically loaded from localStorage or defaults to student_001
const STUDENT_DATA = {
    get studentId() {
        return localStorage.getItem('studentId') || 'student_001';
    },
    get name() {
        return localStorage.getItem('studentName') || 'John Doe';
    },
    currentDifficulty: 'medium',
    lessonsCompleted: 12,
    averageScore: 85
};

// API Configuration
const API_CONFIG = {
     API_ENDPOINT: 'https://tla1r8guz5.execute-api.us-east-2.amazonaws.com/prod',


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
    USE_MOCK_DATA: false  // Set to true for local testing without backend
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
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        cache: 'no-store'  // Prevent browser from caching responses
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
 * Get mock quiz (for quiz generation) with difficulty-based questions
 */
function getMockQuiz(requestData) {
    const subject = requestData?.subject || 'Biology';
    const topic = requestData?.topic || 'Photosynthesis';
    const difficulty = requestData?.difficulty || 'medium';

    // Get difficulty-appropriate questions
    const questions = getQuizQuestionsByDifficulty(topic, difficulty);

    return {
        success: true,
        quizId: `mock_quiz_${Date.now()}`,
        quiz: {
            subject: subject,
            topic: topic,
            difficulty: difficulty,
            questions: questions,
            generatedBy: `Mock Data (${difficulty} difficulty)`,
            generatedAt: new Date().toISOString()
        },
        message: `Quiz generated at ${difficulty} difficulty level`
    };
}

/**
 * Get quiz questions based on difficulty level
 */
function getQuizQuestionsByDifficulty(topic, difficulty) {
    const questionBank = {
        // EASY LEVEL - Simple recall and basic understanding
        easy: [
            {
                question: 'What do plants make during photosynthesis?',
                options: [
                    'Food (glucose)',
                    'Water',
                    'Soil',
                    'Carbon dioxide'
                ],
                correctAnswer: 0,
                explanation: 'Plants make their own food (glucose/sugar) during photosynthesis.'
            },
            {
                question: 'What color are most plants?',
                options: [
                    'Red',
                    'Green',
                    'Blue',
                    'Yellow'
                ],
                correctAnswer: 1,
                explanation: 'Plants are green because of chlorophyll, which helps them make food.'
            },
            {
                question: 'What does a plant need from the sun?',
                options: [
                    'Heat only',
                    'Light',
                    'Nothing',
                    'Darkness'
                ],
                correctAnswer: 1,
                explanation: 'Plants need sunlight (light energy) to make food through photosynthesis.'
            },
            {
                question: 'Where do plants get water from?',
                options: [
                    'The air',
                    'The sun',
                    'The soil through roots',
                    'Other plants'
                ],
                correctAnswer: 2,
                explanation: 'Plants absorb water from the soil through their roots.'
            },
            {
                question: 'What do plants give off that we breathe?',
                options: [
                    'Carbon dioxide',
                    'Nitrogen',
                    'Oxygen',
                    'Hydrogen'
                ],
                correctAnswer: 2,
                explanation: 'Plants release oxygen during photosynthesis, which we need to breathe.'
            }
        ],

        // MEDIUM LEVEL - Application and analysis
        medium: [
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
                question: 'Where does photosynthesis take place in plant cells?',
                options: [
                    'Mitochondria',
                    'Chloroplasts',
                    'Nucleus',
                    'Ribosomes'
                ],
                correctAnswer: 1,
                explanation: 'Photosynthesis occurs in chloroplasts, which contain chlorophyll.'
            },
            {
                question: 'What are the main products of photosynthesis?',
                options: [
                    'Carbon dioxide and water',
                    'Glucose and oxygen',
                    'Oxygen and nitrogen',
                    'Water and glucose'
                ],
                correctAnswer: 1,
                explanation: 'Photosynthesis produces glucose (food for the plant) and oxygen as a byproduct.'
            },
            {
                question: 'Which gas do plants absorb during photosynthesis?',
                options: [
                    'Oxygen',
                    'Nitrogen',
                    'Carbon dioxide',
                    'Hydrogen'
                ],
                correctAnswer: 2,
                explanation: 'Plants absorb carbon dioxide (CO₂) from the air during photosynthesis.'
            },
            {
                question: 'What is the chemical equation for photosynthesis?',
                options: [
                    'H₂O + O₂ → Glucose',
                    '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
                    'CO₂ + Light → O₂',
                    'Glucose → CO₂ + H₂O'
                ],
                correctAnswer: 1,
                explanation: 'The equation shows 6 molecules of CO₂ and water using light energy to create glucose and oxygen.'
            }
        ],

        // HARD LEVEL - Complex analysis and synthesis
        hard: [
            {
                question: 'In the light-dependent reactions of photosynthesis, what is the role of photosystem II?',
                options: [
                    'To fix carbon dioxide into organic molecules',
                    'To split water molecules and release oxygen',
                    'To produce NADPH directly',
                    'To synthesize glucose'
                ],
                correctAnswer: 1,
                explanation: 'Photosystem II splits water molecules (photolysis), releasing oxygen, protons, and electrons that drive the electron transport chain.'
            },
            {
                question: 'Why do C4 plants have an advantage in hot, dry climates compared to C3 plants?',
                options: [
                    'They require less sunlight',
                    'They minimize photorespiration by spatially separating CO₂ fixation',
                    'They produce more oxygen',
                    'They need less water for photosynthesis'
                ],
                correctAnswer: 1,
                explanation: 'C4 plants use a specialized carbon fixation pathway that concentrates CO₂, reducing photorespiration and water loss in hot conditions.'
            },
            {
                question: 'What is the role of the Calvin cycle in photosynthesis?',
                options: [
                    'To capture light energy',
                    'To produce oxygen from water',
                    'To fix CO₂ into organic molecules using ATP and NADPH',
                    'To create the proton gradient'
                ],
                correctAnswer: 2,
                explanation: 'The Calvin cycle (light-independent reactions) uses ATP and NADPH from light reactions to convert CO₂ into glucose through carbon fixation.'
            },
            {
                question: 'Which factor limits photosynthesis rate when light intensity and CO₂ are optimal?',
                options: [
                    'Water availability',
                    'Temperature affecting enzyme activity',
                    'Oxygen concentration',
                    'Nitrogen in soil'
                ],
                correctAnswer: 1,
                explanation: 'Temperature affects the rate of enzyme-catalyzed reactions. Too high or too low temperatures denature enzymes or slow reactions.'
            },
            {
                question: 'What is photorespiration and why is it considered wasteful?',
                options: [
                    'It produces extra glucose',
                    'RuBisCO fixes O₂ instead of CO₂, consuming energy without producing glucose',
                    'It creates more ATP than needed',
                    'It releases too much oxygen'
                ],
                correctAnswer: 1,
                explanation: 'Photorespiration occurs when RuBisCO enzyme binds oxygen instead of CO₂, wasting energy and reducing photosynthetic efficiency.'
            }
        ]
    };

    // Return questions based on difficulty, default to medium if not found
    return questionBank[difficulty] || questionBank['medium'];
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
