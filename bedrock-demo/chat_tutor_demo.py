"""
SmartTutor - AI Chat Tutor Demo using Amazon Bedrock
Demonstrates conversational tutoring with confusion detection and adaptive responses
"""

import boto3
import json
from datetime import datetime

class ChatTutor:
    def __init__(self, region='us-east-1'):
        """Initialize Bedrock client for chat tutoring"""
        self.bedrock = boto3.client('bedrock-runtime', region_name=region)
        self.claude_model = 'anthropic.claude-3-sonnet-20240229-v1:0'
        self.conversation_history = []
        self.confusion_count = 0
        self.current_difficulty = "medium"

    def chat(self, student_question, student_id="student_001", context=None):
        """
        Handle student question with conversational AI tutor

        Args:
            student_question: The student's question or doubt
            student_id: Unique student identifier
            context: Optional context about current lesson/topic

        Returns:
            AI tutor response with metadata
        """

        # Detect confusion signals
        is_confused = self._detect_confusion(student_question)
        if is_confused:
            self.confusion_count += 1

        # Adjust difficulty based on confusion
        if self.confusion_count >= 2:
            self.current_difficulty = "easy"
        elif self.confusion_count == 0:
            self.current_difficulty = "medium"

        # Build system prompt
        system_prompt = f"""You are SmartTutor, an expert AI educational assistant.

Your role:
- Answer student questions clearly and patiently
- Use {self.current_difficulty}-level explanations
- Break down complex concepts into simple steps
- Provide examples and analogies
- Encourage learning without giving direct test answers
- Be supportive and encouraging

Current difficulty setting: {self.current_difficulty.upper()}
{f"Lesson context: {context}" if context else ""}

If the student seems confused, simplify your explanation further.
"""

        # Add student question to history
        self.conversation_history.append({
            "role": "user",
            "content": student_question
        })

        # Keep only last 5 exchanges to manage context
        recent_history = self.conversation_history[-10:]

        try:
            response = self.bedrock.invoke_model(
                modelId=self.claude_model,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 800,
                    "temperature": 0.7,
                    "system": system_prompt,
                    "messages": recent_history
                })
            )

            response_body = json.loads(response['body'].read())
            tutor_response = response_body['content'][0]['text']

            # Add tutor response to history
            self.conversation_history.append({
                "role": "assistant",
                "content": tutor_response
            })

            return {
                'question': student_question,
                'response': tutor_response,
                'confusion_detected': is_confused,
                'confusion_count': self.confusion_count,
                'current_difficulty': self.current_difficulty,
                'timestamp': datetime.now().isoformat(),
                'model': self.claude_model
            }

        except Exception as e:
            return {
                'error': str(e),
                'question': student_question
            }

    def _detect_confusion(self, text):
        """
        Detect confusion signals in student questions

        Args:
            text: Student's question or statement

        Returns:
            Boolean indicating if confusion detected
        """

        confusion_keywords = [
            "don't understand",
            "confused",
            "what does that mean",
            "i don't get it",
            "can you explain",
            "still don't understand",
            "not sure",
            "unclear",
            "complicated",
            "difficult",
            "help",
            "what is",
            "why is"
        ]

        text_lower = text.lower()
        return any(keyword in text_lower for keyword in confusion_keywords)

    def reset_conversation(self):
        """Reset conversation history and confusion tracking"""
        self.conversation_history = []
        self.confusion_count = 0
        self.current_difficulty = "medium"

    def get_conversation_summary(self):
        """Get summary of current conversation"""
        return {
            'total_exchanges': len(self.conversation_history) // 2,
            'confusion_count': self.confusion_count,
            'current_difficulty': self.current_difficulty,
            'history': self.conversation_history
        }


def demo_chat_tutoring():
    """Demonstrate AI chat tutor with various scenarios"""

    tutor = ChatTutor()

    print("=" * 80)
    print("SMARTTUTOR - AI CHAT TUTOR DEMONSTRATION")
    print("=" * 80)

    # Scenario 1: Normal learning conversation
    print("\n" + "#" * 80)
    print("SCENARIO 1: Normal Learning Conversation")
    print("#" * 80 + "\n")

    conversation_1 = [
        "What is photosynthesis?",
        "How do plants use sunlight?",
        "What is chlorophyll?"
    ]

    for question in conversation_1:
        print(f"🧑 Student: {question}")
        response = tutor.chat(question, context="Photosynthesis lesson")

        if 'error' not in response:
            print(f"🤖 Tutor: {response['response']}")
            print(f"   [Difficulty: {response['current_difficulty']} | "
                  f"Confusion: {response['confusion_count']}]\n")
        else:
            print(f"❌ Error: {response['error']}\n")

    # Scenario 2: Student showing confusion
    print("\n" + "#" * 80)
    print("SCENARIO 2: Student Confused - Adaptive Response")
    print("#" * 80 + "\n")

    tutor.reset_conversation()

    conversation_2 = [
        "Explain photosynthesis",
        "I don't understand the chemical equation",
        "Still confused about how CO2 is used",
        "Can you explain it more simply?"
    ]

    for question in conversation_2:
        print(f"🧑 Student: {question}")
        response = tutor.chat(question, context="Photosynthesis lesson")

        if 'error' not in response:
            print(f"🤖 Tutor: {response['response']}")
            if response['confusion_detected']:
                print(f"   ⚠️  CONFUSION DETECTED!")
            print(f"   [Difficulty adjusted to: {response['current_difficulty'].upper()} | "
                  f"Total confusion signals: {response['confusion_count']}]\n")

    # Scenario 3: Quick factual questions
    print("\n" + "#" * 80)
    print("SCENARIO 3: Quick Factual Questions")
    print("#" * 80 + "\n")

    tutor.reset_conversation()

    conversation_3 = [
        "What gas do plants release?",
        "Where does photosynthesis happen?",
        "Do all plants photosynthesize?"
    ]

    for question in conversation_3:
        print(f"🧑 Student: {question}")
        response = tutor.chat(question)

        if 'error' not in response:
            print(f"🤖 Tutor: {response['response'][:200]}...\n")


def demo_with_mock_responses():
    """Demo with simulated responses (no AWS needed)"""

    print("\n" + "=" * 80)
    print("MOCK CHAT TUTOR DEMONSTRATION (No AWS Required)")
    print("=" * 80 + "\n")

    # Simulate chat tutor behavior
    mock_tutor = ChatTutor()

    scenarios = [
        {
            'question': "What is photosynthesis?",
            'mock_response': "Photosynthesis is the process plants use to convert sunlight into food. "
                           "Plants take in carbon dioxide (CO₂) from the air and water (H₂O) from the "
                           "soil. Using energy from sunlight, they produce glucose (sugar) for energy "
                           "and release oxygen (O₂) as a byproduct. Think of it like cooking - plants "
                           "use sunlight as their 'stove' to cook up their food!"
        },
        {
            'question': "I don't understand how plants make oxygen",
            'mock_response': "Great question! Let me simplify it. During photosynthesis, plants split "
                           "water molecules (H₂O) into hydrogen and oxygen. The plant uses the hydrogen "
                           "to help make glucose, but it doesn't need all the oxygen. So the extra "
                           "oxygen is released into the air - that's the oxygen we breathe! It's like "
                           "when you're cooking and have leftover ingredients you don't need."
        },
        {
            'question': "Why is chlorophyll green?",
            'mock_response': "Chlorophyll looks green because it reflects green light while absorbing "
                           "red and blue light. Imagine chlorophyll as wearing sunglasses that block "
                           "everything except green - so green is what we see! The absorbed red and "
                           "blue light is used for photosynthesis, while green light bounces off."
        }
    ]

    for i, scenario in enumerate(scenarios, 1):
        print(f"Exchange {i}:")
        print(f"🧑 Student: {scenario['question']}")

        # Detect confusion
        is_confused = mock_tutor._detect_confusion(scenario['question'])
        if is_confused:
            mock_tutor.confusion_count += 1

        print(f"🤖 Tutor: {scenario['mock_response']}")

        if is_confused:
            print(f"   ⚠️  Confusion detected! Adjusting explanation difficulty.")
            mock_tutor.current_difficulty = "easy"

        print(f"   [Difficulty: {mock_tutor.current_difficulty} | "
              f"Confusion count: {mock_tutor.confusion_count}]")
        print()


def demo_confusion_detection():
    """Demonstrate confusion detection mechanism"""

    print("\n" + "=" * 80)
    print("CONFUSION DETECTION DEMONSTRATION")
    print("=" * 80 + "\n")

    tutor = ChatTutor()

    test_phrases = [
        ("What is photosynthesis?", False),
        ("I don't understand this", True),
        ("Can you explain chlorophyll?", True),
        ("Tell me about plants", False),
        ("This is confusing", True),
        ("I still don't get it", True),
        ("What happens next?", False),
        ("Why is this so difficult?", True),
    ]

    for phrase, expected in test_phrases:
        detected = tutor._detect_confusion(phrase)
        status = "✓" if detected == expected else "✗"
        indicator = "🔴 CONFUSED" if detected else "🟢 CLEAR"

        print(f"{status} '{phrase}'")
        print(f"   → {indicator}\n")


if __name__ == "__main__":
    print("""
    ⚠️  SETUP REQUIRED FOR LIVE DEMO:
    1. Configure AWS credentials: aws configure
    2. Enable Amazon Bedrock access
    3. Request Claude 3 Sonnet model access

    ℹ️  MOCK DEMOS: Run without AWS credentials
    """)

    print("\nRunning demonstration...\n")

    # These work without AWS credentials:
    demo_with_mock_responses()
    demo_confusion_detection()

    # Uncomment to run with AWS Bedrock:
    # demo_chat_tutoring()

    print("\n✅ Chat tutor demonstration complete!")
