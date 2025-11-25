/**
 * Simple version - exports functions immediately
 */

console.log('student-dashboard-simple.js loaded');

// Export functions immediately
window.selectTopic = function(subject, topic) {
    alert(`Topic selected: ${subject} - ${topic}`);
    console.log(`Selected: ${subject} - ${topic}`);
    window.location.href = `pages/quiz.html?subject=${subject}&topic=${topic}`;
};

window.startQuiz = function(topic) {
    window.location.href = `pages/quiz.html?topic=${topic}`;
};

window.openChat = function() {
    window.location.href = 'pages/chat-tutor.html';
};

console.log('Functions exported:', typeof window.selectTopic);
