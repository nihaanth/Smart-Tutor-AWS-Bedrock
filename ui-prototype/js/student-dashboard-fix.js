/**
 * SmartTutor Student Dashboard - Simplified Version
 * This version exports functions immediately without dependencies
 */

console.log('Loading student-dashboard-fix.js...');

// Export functions to window IMMEDIATELY - no dependencies
window.selectTopic = function(subject, topic) {
    console.log(`Topic selected: ${subject} - ${topic}`);

    // Show simple alert
    alert(`Loading ${subject} - ${topic}...`);

    // Navigate to quiz page
    window.location.href = `pages/quiz.html?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`;
};

window.startQuiz = function(topic) {
    console.log(`Starting quiz: ${topic}`);
    window.location.href = `pages/quiz.html?topic=${encodeURIComponent(topic)}`;
};

window.openChat = function() {
    console.log('Opening chat...');
    window.location.href = 'pages/chat-tutor.html';
};

console.log('✅ student-dashboard-fix.js loaded successfully');
console.log('✅ selectTopic type:', typeof window.selectTopic);
console.log('✅ startQuiz type:', typeof window.startQuiz);
console.log('✅ openChat type:', typeof window.openChat);
