"""
SmartTutor - Lesson Generation Demo using Amazon Bedrock
Demonstrates adaptive lesson generation at Easy, Medium, and Hard difficulty levels
"""

import boto3
import json
from datetime import datetime

class LessonGenerator:
    def __init__(self, region='us-east-1'):
        """Initialize Bedrock client"""
        self.bedrock = boto3.client('bedrock-runtime', region_name=region)
        self.claude_model = 'anthropic.claude-3-sonnet-20240229-v1:0'

    def generate_lesson(self, topic, difficulty, grade_level="middle school"):
        """
        Generate a personalized lesson using Claude 3 Sonnet

        Args:
            topic: Subject topic (e.g., "Photosynthesis")
            difficulty: "easy", "medium", or "hard"
            grade_level: Target student level

        Returns:
            Generated lesson content
        """

        # Difficulty-specific prompt templates
        difficulty_instructions = {
            "easy": """
                - Use simple vocabulary and short sentences
                - Provide concrete examples and analogies
                - Break down concepts into very small steps
                - Include visual descriptions
                - Keep explanations brief and focused
            """,
            "medium": """
                - Use grade-appropriate vocabulary
                - Include some technical terms with explanations
                - Provide multiple examples
                - Connect concepts to real-world applications
                - Balance detail with clarity
            """,
            "hard": """
                - Use advanced vocabulary and complex sentences
                - Include scientific terminology and detailed explanations
                - Discuss underlying mechanisms and theories
                - Encourage critical thinking with challenging questions
                - Provide in-depth analysis
            """
        }

        prompt = f"""You are an expert educational AI tutor creating personalized lessons.

Generate a {difficulty}-level lesson on "{topic}" for {grade_level} students.

Difficulty Guidelines ({difficulty.upper()}):
{difficulty_instructions[difficulty]}

Lesson Structure:
1. **Introduction** (2-3 sentences hooking the student's interest)
2. **Key Concepts** (3-4 paragraphs explaining the main ideas)
3. **Examples** (2-3 real-world examples or applications)
4. **Summary** (Brief recap of main points)
5. **Check Your Understanding** (2-3 questions for self-assessment)

Make the lesson engaging, clear, and appropriate for the {difficulty} difficulty level.
"""

        try:
            # Invoke Claude 3 Sonnet via Bedrock
            response = self.bedrock.invoke_model(
                modelId=self.claude_model,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1500,
                    "temperature": 0.7,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            )

            # Parse response
            response_body = json.loads(response['body'].read())
            lesson_content = response_body['content'][0]['text']

            return {
                'topic': topic,
                'difficulty': difficulty,
                'grade_level': grade_level,
                'content': lesson_content,
                'generated_at': datetime.now().isoformat(),
                'model': self.claude_model,
                'tokens_used': response_body.get('usage', {})
            }

        except Exception as e:
            return {
                'error': str(e),
                'topic': topic,
                'difficulty': difficulty
            }


def demo_lesson_generation():
    """Run demonstration of lesson generation across difficulty levels"""

    generator = LessonGenerator()

    # Test topics
    topics = [
        "Photosynthesis",
        "Fractions and Decimals",
        "The Water Cycle"
    ]

    difficulties = ["easy", "medium", "hard"]

    print("=" * 80)
    print("SMARTTUTOR - LESSON GENERATION DEMONSTRATION")
    print("=" * 80)
    print()

    for topic in topics:
        print(f"\n{'#' * 80}")
        print(f"TOPIC: {topic}")
        print(f"{'#' * 80}\n")

        for difficulty in difficulties:
            print(f"\n{'=' * 60}")
            print(f"DIFFICULTY LEVEL: {difficulty.upper()}")
            print(f"{'=' * 60}\n")

            result = generator.generate_lesson(topic, difficulty)

            if 'error' in result:
                print(f"❌ Error generating lesson: {result['error']}")
            else:
                print(result['content'])
                print(f"\n📊 Tokens Used: {result['tokens_used']}")
                print(f"⏰ Generated: {result['generated_at']}")

            print("\n" + "-" * 60 + "\n")


def compare_difficulty_levels():
    """Compare same topic across different difficulty levels"""

    generator = LessonGenerator()
    topic = "Photosynthesis"

    print("=" * 80)
    print("DIFFICULTY COMPARISON: How AI adapts the same topic")
    print("=" * 80)
    print(f"\nTopic: {topic}\n")

    for difficulty in ["easy", "medium", "hard"]:
        print(f"\n{'#' * 60}")
        print(f"{difficulty.upper()} DIFFICULTY")
        print(f"{'#' * 60}\n")

        result = generator.generate_lesson(topic, difficulty)

        if 'error' not in result:
            # Show first 500 characters to compare
            preview = result['content'][:500] + "..."
            print(preview)

            # Analyze complexity
            word_count = len(result['content'].split())
            avg_word_length = sum(len(word) for word in result['content'].split()) / word_count

            print(f"\n📊 Analysis:")
            print(f"   Word Count: {word_count}")
            print(f"   Avg Word Length: {avg_word_length:.2f} characters")

        print("\n" + "-" * 60)


if __name__ == "__main__":
    # Note: This requires AWS credentials with Bedrock access
    print("""
    ⚠️  SETUP REQUIRED:
    1. Configure AWS credentials: aws configure
    2. Enable Amazon Bedrock in your AWS account
    3. Request access to Claude 3 Sonnet model
    4. Install dependencies: pip install boto3
    """)

    print("\nStarting demonstration...\n")

    # Uncomment to run demos:
    # demo_lesson_generation()
    # compare_difficulty_levels()

    print("\n✅ Demo script ready. Uncomment function calls to run with AWS credentials.")
