"""
SmartTutor - Adaptive Difficulty Engine Demonstration
Shows how the system adjusts content difficulty based on student performance
"""

import json
from datetime import datetime

class AdaptiveDifficultyEngine:
    """
    Adaptive difficulty engine that adjusts lesson complexity based on:
    - Quiz performance
    - Confusion frequency
    - Clarification requests
    - Response time (simulated)
    """

    def __init__(self, student_id):
        self.student_id = student_id
        self.current_difficulty = "medium"
        self.performance_history = []
        self.confusion_count = 0
        self.total_clarifications = 0

    def update_from_quiz(self, quiz_score, total_questions):
        """
        Update difficulty based on quiz performance

        Args:
            quiz_score: Number of correct answers
            total_questions: Total number of questions

        Returns:
            New difficulty level and explanation
        """

        percentage = (quiz_score / total_questions) * 100

        # Store performance
        self.performance_history.append({
            'score': quiz_score,
            'total': total_questions,
            'percentage': percentage,
            'timestamp': datetime.now().isoformat()
        })

        # Difficulty adjustment rules
        old_difficulty = self.current_difficulty

        if percentage < 60:
            self.current_difficulty = "easy"
            reason = f"Score {percentage:.1f}% below 60% threshold"
        elif percentage > 80:
            self.current_difficulty = "hard"
            reason = f"Score {percentage:.1f}% above 80% threshold - ready for challenge"
        else:
            self.current_difficulty = "medium"
            reason = f"Score {percentage:.1f}% in optimal range (60-80%)"

        return {
            'old_difficulty': old_difficulty,
            'new_difficulty': self.current_difficulty,
            'score_percentage': percentage,
            'reason': reason,
            'adjustment_made': (old_difficulty != self.current_difficulty)
        }

    def update_from_confusion(self, confused):
        """
        Track confusion signals from chat interactions

        Args:
            confused: Boolean indicating if confusion detected

        Returns:
            Updated difficulty info
        """

        if confused:
            self.confusion_count += 1

        old_difficulty = self.current_difficulty

        # If student confused multiple times, simplify
        if self.confusion_count >= 2:
            self.current_difficulty = "easy"
            reason = f"Multiple confusion signals detected ({self.confusion_count})"
            adjustment_made = (old_difficulty != "easy")
        else:
            adjustment_made = False
            reason = f"Confusion count: {self.confusion_count} (threshold: 2)"

        return {
            'old_difficulty': old_difficulty,
            'new_difficulty': self.current_difficulty,
            'confusion_count': self.confusion_count,
            'reason': reason,
            'adjustment_made': adjustment_made
        }

    def update_from_clarification_request(self):
        """
        Track when student asks for clarification

        Returns:
            Updated difficulty info
        """

        self.total_clarifications += 1

        old_difficulty = self.current_difficulty

        # If too many clarifications, content may be too hard
        if self.total_clarifications >= 3 and self.current_difficulty != "easy":
            self.current_difficulty = "easy"
            reason = f"Multiple clarification requests ({self.total_clarifications})"
            adjustment_made = True
        else:
            adjustment_made = False
            reason = f"Clarifications: {self.total_clarifications} (threshold: 3)"

        return {
            'old_difficulty': old_difficulty,
            'new_difficulty': self.current_difficulty,
            'total_clarifications': self.total_clarifications,
            'reason': reason,
            'adjustment_made': adjustment_made
        }

    def get_recommendation(self):
        """
        Get current difficulty recommendation based on all factors

        Returns:
            Comprehensive recommendation
        """

        # Calculate average performance
        if self.performance_history:
            avg_score = sum(p['percentage'] for p in self.performance_history) / len(self.performance_history)
        else:
            avg_score = None

        # Recommendation logic
        factors = []

        if avg_score is not None:
            if avg_score < 60:
                factors.append(f"Low average score ({avg_score:.1f}%)")
            elif avg_score > 85:
                factors.append(f"High average score ({avg_score:.1f}%)")

        if self.confusion_count > 0:
            factors.append(f"Confusion signals: {self.confusion_count}")

        if self.total_clarifications > 0:
            factors.append(f"Clarification requests: {self.total_clarifications}")

        return {
            'student_id': self.student_id,
            'current_difficulty': self.current_difficulty,
            'average_score': avg_score,
            'confusion_count': self.confusion_count,
            'clarification_requests': self.total_clarifications,
            'total_quizzes': len(self.performance_history),
            'factors': factors,
            'timestamp': datetime.now().isoformat()
        }

    def reset(self):
        """Reset all tracking metrics"""
        self.confusion_count = 0
        self.total_clarifications = 0
        self.current_difficulty = "medium"


def demo_quiz_based_adjustment():
    """Demonstrate difficulty adjustment based on quiz scores"""

    print("=" * 80)
    print("ADAPTIVE DIFFICULTY - QUIZ PERFORMANCE BASED")
    print("=" * 80 + "\n")

    engine = AdaptiveDifficultyEngine("student_001")

    # Simulate different quiz scenarios
    scenarios = [
        {"name": "Quiz 1: Initial Assessment", "score": 3, "total": 5},
        {"name": "Quiz 2: Struggling", "score": 2, "total": 5},
        {"name": "Quiz 3: After Simplification", "score": 4, "total": 5},
        {"name": "Quiz 4: Improving", "score": 5, "total": 5},
        {"name": "Quiz 5: Mastery", "score": 5, "total": 5},
    ]

    for scenario in scenarios:
        print(f"📝 {scenario['name']}")
        print(f"   Score: {scenario['score']}/{scenario['total']}")

        result = engine.update_from_quiz(scenario['score'], scenario['total'])

        print(f"   Percentage: {result['score_percentage']:.1f}%")

        if result['adjustment_made']:
            print(f"   ⚡ DIFFICULTY ADJUSTED: {result['old_difficulty']} → {result['new_difficulty']}")
        else:
            print(f"   ✓ Difficulty maintained: {result['new_difficulty']}")

        print(f"   💬 {result['reason']}")
        print()


def demo_confusion_based_adjustment():
    """Demonstrate difficulty adjustment based on confusion signals"""

    print("\n" + "=" * 80)
    print("ADAPTIVE DIFFICULTY - CONFUSION BASED")
    print("=" * 80 + "\n")

    engine = AdaptiveDifficultyEngine("student_002")

    print("Student Chat Session:\n")

    interactions = [
        {"question": "What is photosynthesis?", "confused": False},
        {"question": "I don't understand the chemical equation", "confused": True},
        {"question": "Can you explain it more simply?", "confused": True},
        {"question": "Oh, now I get it!", "confused": False},
    ]

    for i, interaction in enumerate(interactions, 1):
        print(f"Interaction {i}:")
        print(f"🧑 Student: {interaction['question']}")

        result = engine.update_from_confusion(interaction['confused'])

        if interaction['confused']:
            print(f"   ⚠️  Confusion detected!")

        if result['adjustment_made']:
            print(f"   ⚡ DIFFICULTY ADJUSTED: {result['old_difficulty']} → {result['new_difficulty']}")
            print(f"   💬 {result['reason']}")
        else:
            print(f"   ✓ Current: {result['new_difficulty']} - {result['reason']}")

        print()


def demo_multi_factor_adjustment():
    """Demonstrate adjustment considering multiple factors"""

    print("\n" + "=" * 80)
    print("ADAPTIVE DIFFICULTY - MULTI-FACTOR ANALYSIS")
    print("=" * 80 + "\n")

    engine = AdaptiveDifficultyEngine("student_003")

    print("Simulating Student Learning Journey:\n")

    # Week 1: Struggling
    print("📅 Week 1: Initial Struggles")
    engine.update_from_quiz(2, 5)  # 40%
    engine.update_from_confusion(True)
    engine.update_from_confusion(True)
    engine.update_from_clarification_request()

    rec = engine.get_recommendation()
    print(f"   Difficulty: {rec['current_difficulty']}")
    print(f"   Avg Score: {rec['average_score']:.1f}%")
    print(f"   Factors: {', '.join(rec['factors'])}")
    print()

    # Week 2: Improving with easier content
    print("📅 Week 2: After Difficulty Adjustment to EASY")
    engine.update_from_quiz(4, 5)  # 80%
    engine.update_from_quiz(4, 5)  # 80%
    engine.reset()  # Reset confusion after improvement

    rec = engine.get_recommendation()
    print(f"   Difficulty: {rec['current_difficulty']}")
    print(f"   Avg Score: {rec['average_score']:.1f}%")
    print(f"   Progress: Improving consistently")
    print()

    # Week 3: Ready for challenge
    print("📅 Week 3: Ready for Advanced Content")
    engine.update_from_quiz(5, 5)  # 100%
    engine.update_from_quiz(5, 5)  # 100%

    rec = engine.get_recommendation()
    print(f"   Difficulty: {rec['current_difficulty']}")
    print(f"   Avg Score: {rec['average_score']:.1f}%")
    print(f"   Status: Mastery achieved - advancing to HARD")
    print()


def demo_realtime_dashboard():
    """Simulate what teacher sees in real-time dashboard"""

    print("\n" + "=" * 80)
    print("TEACHER DASHBOARD - ADAPTIVE DIFFICULTY MONITORING")
    print("=" * 80 + "\n")

    students = [
        {"id": "student_001", "name": "Alice", "quizzes": [(2,5), (3,5), (4,5)]},
        {"id": "student_002", "name": "Bob", "quizzes": [(5,5), (5,5), (5,5)]},
        {"id": "student_003", "name": "Carol", "quizzes": [(3,5), (2,5), (2,5)]},
    ]

    for student in students:
        engine = AdaptiveDifficultyEngine(student['id'])

        print(f"👤 {student['name']} ({student['id']})")

        for quiz_score, quiz_total in student['quizzes']:
            engine.update_from_quiz(quiz_score, quiz_total)

        rec = engine.get_recommendation()

        print(f"   Current Difficulty: {rec['current_difficulty'].upper()}")
        print(f"   Average Score: {rec['average_score']:.1f}%")
        print(f"   Total Quizzes: {rec['total_quizzes']}")

        # Recommendation for teacher
        if rec['average_score'] < 60:
            print(f"   📊 Recommendation: Provide additional support and simplify content")
        elif rec['average_score'] > 85:
            print(f"   📊 Recommendation: Challenge with advanced material")
        else:
            print(f"   📊 Recommendation: Maintain current pace")

        print()


if __name__ == "__main__":
    print("""
    ADAPTIVE DIFFICULTY ENGINE DEMONSTRATION
    ========================================

    This demo shows how SmartTutor adjusts content difficulty based on:
    - Quiz performance scores
    - Confusion signals in chat
    - Clarification requests
    - Historical performance patterns

    No AWS credentials required for this demo.
    """)

    print("\n")

    # Run all demonstrations
    demo_quiz_based_adjustment()
    demo_confusion_based_adjustment()
    demo_multi_factor_adjustment()
    demo_realtime_dashboard()

    print("\n✅ Adaptive difficulty demonstration complete!")
    print("\nKey Insights:")
    print("• Difficulty adjusts automatically based on performance")
    print("• Multiple factors considered for personalization")
    print("• Teachers can monitor and override recommendations")
    print("• System prevents students from getting stuck or bored")
