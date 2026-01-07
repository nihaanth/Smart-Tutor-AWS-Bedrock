"""
SmartTutor - Quiz Generation and Auto-Grading Demo using Amazon Bedrock
Uses Llama 3 for quiz generation and automatic grading
"""

import boto3
import json
from datetime import datetime

class QuizGenerator:
    def __init__(self, region='us-east-1'):
        """Initialize Bedrock client for quiz generation"""
        self.bedrock = boto3.client('bedrock-runtime', region_name=region)
        self.llama_model = 'meta.llama3-70b-instruct-v1:0'

    def generate_quiz(self, topic, difficulty, num_questions=5):
        """
        Generate MCQ quiz using Llama 3

        Args:
            topic: Subject topic
            difficulty: "easy", "medium", or "hard"
            num_questions: Number of questions (default: 5)

        Returns:
            Quiz with questions and answer key
        """

        prompt = f"""Generate a {difficulty}-level multiple choice quiz on "{topic}" with {num_questions} questions.

Requirements:
- Each question should have 4 options (A, B, C, D)
- Only one correct answer per question
- Questions should be clear and unambiguous
- Options should be plausible to avoid obvious answers
- Difficulty should match {difficulty} level

Output format (JSON):
{{
    "quiz_title": "Quiz on {topic}",
    "difficulty": "{difficulty}",
    "questions": [
        {{
            "question_number": 1,
            "question": "Question text here?",
            "options": {{
                "A": "Option A text",
                "B": "Option B text",
                "C": "Option C text",
                "D": "Option D text"
            }},
            "correct_answer": "B",
            "explanation": "Brief explanation why this is correct"
        }}
    ]
}}

Generate the quiz now:"""

        try:
            response = self.bedrock.invoke_model(
                modelId=self.llama_model,
                body=json.dumps({
                    "prompt": prompt,
                    "max_gen_len": 2000,
                    "temperature": 0.6,
                    "top_p": 0.9
                })
            )

            response_body = json.loads(response['body'].read())
            quiz_text = response_body['generation']

            # Parse JSON from response
            try:
                # Extract JSON from markdown code blocks if present
                if "```json" in quiz_text:
                    quiz_text = quiz_text.split("```json")[1].split("```")[0].strip()
                elif "```" in quiz_text:
                    quiz_text = quiz_text.split("```")[1].split("```")[0].strip()

                quiz_data = json.loads(quiz_text)
            except:
                # If parsing fails, return raw text
                quiz_data = {"raw_response": quiz_text}

            quiz_data['generated_at'] = datetime.now().isoformat()
            quiz_data['model'] = self.llama_model

            return quiz_data

        except Exception as e:
            return {'error': str(e), 'topic': topic}

    def grade_quiz(self, quiz_data, student_answers):
        """
        Automatically grade student's quiz submission

        Args:
            quiz_data: Quiz object with correct answers
            student_answers: Dict mapping question_number to student's answer

        Returns:
            Grading results with score and feedback
        """

        if 'questions' not in quiz_data:
            return {'error': 'Invalid quiz data'}

        total_questions = len(quiz_data['questions'])
        correct_count = 0
        results = []

        for question in quiz_data['questions']:
            q_num = question['question_number']
            correct_answer = question['correct_answer']
            student_answer = student_answers.get(q_num, None)

            is_correct = (student_answer == correct_answer)
            if is_correct:
                correct_count += 1

            results.append({
                'question_number': q_num,
                'question': question['question'],
                'student_answer': student_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'explanation': question.get('explanation', '')
            })

        score_percentage = (correct_count / total_questions) * 100

        # Determine difficulty adjustment recommendation
        if score_percentage < 60:
            difficulty_recommendation = "easy"
            feedback = "Consider reviewing the material. Next lesson will be simplified."
        elif score_percentage > 80:
            difficulty_recommendation = "hard"
            feedback = "Excellent work! Ready for more challenging content."
        else:
            difficulty_recommendation = "medium"
            feedback = "Good progress! Continue at this level."

        return {
            'total_questions': total_questions,
            'correct_answers': correct_count,
            'score_percentage': score_percentage,
            'grade': self._calculate_letter_grade(score_percentage),
            'difficulty_recommendation': difficulty_recommendation,
            'feedback': feedback,
            'detailed_results': results,
            'graded_at': datetime.now().isoformat()
        }

    def _calculate_letter_grade(self, percentage):
        """Convert percentage to letter grade"""
        if percentage >= 90:
            return 'A'
        elif percentage >= 80:
            return 'B'
        elif percentage >= 70:
            return 'C'
        elif percentage >= 60:
            return 'D'
        else:
            return 'F'


def demo_quiz_generation():
    """Demonstrate quiz generation across topics and difficulties"""

    generator = QuizGenerator()

    topics = ["Photosynthesis", "Fractions", "American Revolution"]
    difficulties = ["easy", "medium", "hard"]

    print("=" * 80)
    print("SMARTTUTOR - QUIZ GENERATION DEMONSTRATION")
    print("=" * 80)

    for topic in topics:
        print(f"\n{'#' * 80}")
        print(f"TOPIC: {topic}")
        print(f"{'#' * 80}\n")

        for difficulty in difficulties:
            print(f"\n{'=' * 60}")
            print(f"DIFFICULTY: {difficulty.upper()}")
            print(f"{'=' * 60}\n")

            quiz = generator.generate_quiz(topic, difficulty, num_questions=3)

            if 'error' in quiz:
                print(f"Error: {quiz['error']}")
            else:
                print(f"{quiz.get('quiz_title', 'Quiz')}")
                print(f"Difficulty: {quiz.get('difficulty', difficulty)}\n")

                if 'questions' in quiz:
                    for q in quiz['questions']:
                        print(f"\nQ{q['question_number']}. {q['question']}")
                        for opt_key, opt_val in q['options'].items():
                            print(f"   {opt_key}) {opt_val}")
                        print(f"   Answer: {q['correct_answer']}")
                else:
                    print(quiz.get('raw_response', 'Could not parse quiz'))

            print("\n" + "-" * 60)


def demo_auto_grading():
    """Demonstrate automatic grading and difficulty adjustment"""

    generator = QuizGenerator()

    print("\n" + "=" * 80)
    print("AUTO-GRADING DEMONSTRATION")
    print("=" * 80)

    # Generate a sample quiz
    quiz = generator.generate_quiz("Photosynthesis", "medium", num_questions=5)

    if 'error' in quiz or 'questions' not in quiz:
        print("Using mock quiz for demo")
        # Create mock quiz
        quiz = {
            'quiz_title': 'Photosynthesis Quiz',
            'difficulty': 'medium',
            'questions': [
                {
                    'question_number': 1,
                    'question': 'What is the primary function of chlorophyll?',
                    'options': {'A': 'Store energy', 'B': 'Absorb light', 'C': 'Release oxygen', 'D': 'Transport water'},
                    'correct_answer': 'B',
                    'explanation': 'Chlorophyll absorbs light energy for photosynthesis'
                },
                {
                    'question_number': 2,
                    'question': 'Which gas is released during photosynthesis?',
                    'options': {'A': 'Carbon dioxide', 'B': 'Nitrogen', 'C': 'Oxygen', 'D': 'Hydrogen'},
                    'correct_answer': 'C',
                    'explanation': 'Oxygen is released as a byproduct'
                },
                {
                    'question_number': 3,
                    'question': 'Where does photosynthesis occur?',
                    'options': {'A': 'Mitochondria', 'B': 'Nucleus', 'C': 'Chloroplasts', 'D': 'Ribosomes'},
                    'correct_answer': 'C',
                    'explanation': 'Photosynthesis occurs in chloroplasts'
                },
                {
                    'question_number': 4,
                    'question': 'What is the main product of photosynthesis?',
                    'options': {'A': 'Water', 'B': 'Glucose', 'C': 'ATP', 'D': 'Protein'},
                    'correct_answer': 'B',
                    'explanation': 'Glucose is the primary energy product'
                },
                {
                    'question_number': 5,
                    'question': 'Which part of the plant is primarily responsible for photosynthesis?',
                    'options': {'A': 'Roots', 'B': 'Stem', 'C': 'Leaves', 'D': 'Flowers'},
                    'correct_answer': 'C',
                    'explanation': 'Leaves contain the most chloroplasts'
                }
            ]
        }

    print(f"\nQuiz: {quiz['quiz_title']}")
    print(f"Difficulty: {quiz['difficulty']}\n")

    # Simulate three student scenarios
    scenarios = [
        {
            'name': 'Student A (Struggling)',
            'answers': {1: 'A', 2: 'A', 3: 'A', 4: 'A', 5: 'A'}  # All wrong
        },
        {
            'name': 'Student B (Average)',
            'answers': {1: 'B', 2: 'C', 3: 'A', 4: 'B', 5: 'C'}  # 3/5 correct
        },
        {
            'name': 'Student C (Excellent)',
            'answers': {1: 'B', 2: 'C', 3: 'C', 4: 'B', 5: 'C'}  # All correct
        }
    ]

    for scenario in scenarios:
        print(f"\n{'=' * 60}")
        print(f"{scenario['name']}")
        print(f"{'=' * 60}\n")

        results = generator.grade_quiz(quiz, scenario['answers'])

        print(f"Score: {results['correct_answers']}/{results['total_questions']} "
              f"({results['score_percentage']:.1f}%) - Grade: {results['grade']}")
        print(f"Feedback: {results['feedback']}")
        print(f"Next Difficulty: {results['difficulty_recommendation'].upper()}")

        print("\nDetailed Results:")
        for detail in results['detailed_results']:
            status = "CORRECT" if detail['is_correct'] else "INCORRECT"
            print(f"  {status} Q{detail['question_number']}: "
                  f"Your answer: {detail['student_answer']}, "
                  f"Correct: {detail['correct_answer']}")


if __name__ == "__main__":
    print("""
    SETUP REQUIRED:
    1. Configure AWS credentials: aws configure
    2. Enable Amazon Bedrock in your AWS account
    3. Request access to Llama 3 model
    4. Install dependencies: pip install boto3
    """)

    print("\nStarting demonstration...\n")

    # Uncomment to run demos:
    # demo_quiz_generation()
    demo_auto_grading()  # This works with mock data

    print("\nDemo complete!")
