"""
SmartTutor - Quiz Generator Lambda Function
Generates personalized quizzes using Amazon Bedrock (Llama 3 70B)
"""

import json
import boto3
import os
from datetime import datetime
from typing import Dict, Any, List

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Configuration
S3_BUCKET = os.environ.get('SMARTTUTOR_BUCKET', 'smarttutor-content-dev')
QUIZZES_TABLE = os.environ.get('QUIZZES_TABLE', 'SmartTutor-Quizzes')

def lambda_handler(event, context):
    """
    Main Lambda handler for quiz generation
    """
    try:
        # Parse request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)

        print(f"Received quiz generation request: {json.dumps(body)}")

        # Extract parameters
        student_id = body.get('studentId', 'student_001')
        subject = body.get('subject', 'Biology')
        topic = body.get('topic', 'Photosynthesis')
        difficulty = body.get('difficulty', 'medium')
        num_questions = body.get('numQuestions', 5)
        student_performance = body.get('studentPerformance', {})

        # Generate quiz using Bedrock
        quiz_content = generate_quiz_with_bedrock(
            subject, topic, difficulty, num_questions, student_performance
        )

        # Create unique quiz ID
        quiz_id = f"{student_id}_{subject}_{topic}_quiz_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        # Store quiz to S3
        s3_key = f"quizzes/{student_id}/{quiz_id}.json"
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(quiz_content, indent=2),
            ContentType='application/json'
        )

        # Store metadata to DynamoDB
        table = dynamodb.Table(QUIZZES_TABLE)
        table.put_item(
            Item={
                'quizId': quiz_id,
                'studentId': student_id,
                'subject': subject,
                'topic': topic,
                'difficulty': difficulty,
                'numQuestions': num_questions,
                's3Key': s3_key,
                'createdAt': datetime.utcnow().isoformat(),
                'status': 'generated',
                'completed': False
            }
        )

        print(f"Quiz generated and stored: {quiz_id}")

        # Extract correct answers array for easy evaluation
        correct_answers = [q.get('correctAnswer', 0) for q in quiz_content.get('questions', [])]

        # Return response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'quizId': quiz_id,
                'quiz': quiz_content,
                'correctAnswers': correct_answers,
                'generatedAt': datetime.utcnow().isoformat(),
                'message': 'Quiz generated successfully'
            })
        }

    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate quiz'
            })
        }


def generate_quiz_with_bedrock(subject: str, topic: str, difficulty: str,
                                num_questions: int, student_performance: Dict) -> Dict[str, Any]:
    """
    Generate quiz questions using Llama 3 70B via Bedrock
    """

    # Build prompt for Llama
    prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an expert educator creating quiz questions for students.
<|eot_id|><|start_header_id|>user<|end_header_id|>

Create a {num_questions}-question quiz on the following topic:

Subject: {subject}
Topic: {topic}
Difficulty Level: {difficulty.upper()}
Student's Average Score: {student_performance.get('averageScore', 75)}%

Requirements:
1. Generate exactly {num_questions} multiple-choice questions
2. Each question should have 4 options (A, B, C, D)
3. Questions should match the {difficulty} difficulty level
4. Include clear explanations for correct answers
5. Mix different question types (concept recall, application, analysis)

Output Format (JSON only, no other text):
{{
    "subject": "{subject}",
    "topic": "{topic}",
    "difficulty": "{difficulty}",
    "totalQuestions": {num_questions},
    "estimatedTime": "X minutes",
    "questions": [
        {{
            "questionNumber": 1,
            "question": "Question text here?",
            "options": [
                "Option A",
                "Option B",
                "Option C",
                "Option D"
            ],
            "correctAnswer": 0,
            "explanation": "Explanation why this is correct...",
            "difficulty": "{difficulty}",
            "topic": "specific subtopic"
        }}
    ]
}}

Generate the quiz now in JSON format:
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

    try:
        # Call Llama 3 70B via Bedrock
        request_body = {
            "prompt": prompt,
            "max_gen_len": 4096,
            "temperature": 0.6,
            "top_p": 0.9
        }

        print("Calling Amazon Bedrock (Llama 3 70B)...")
        response = bedrock_runtime.invoke_model(
            modelId='meta.llama3-70b-instruct-v1:0',
            body=json.dumps(request_body)
        )

        # Parse response
        response_body = json.loads(response['body'].read())
        generated_text = response_body.get('generation', '')

        # Extract JSON from response
        # Try to find JSON content
        if '{' in generated_text and '}' in generated_text:
            json_start = generated_text.find('{')
            json_end = generated_text.rfind('}') + 1
            json_text = generated_text[json_start:json_end]

            # Clean up common issues
            json_text = json_text.replace('```json', '').replace('```', '')

            quiz_content = json.loads(json_text)
        else:
            raise ValueError("No valid JSON found in response")

        # Add metadata
        quiz_content['generatedBy'] = 'Llama 3 70B via Amazon Bedrock'
        quiz_content['generatedAt'] = datetime.utcnow().isoformat()
        quiz_content['subject'] = subject
        quiz_content['topic'] = topic
        quiz_content['difficulty'] = difficulty

        print("Quiz generated successfully")
        return quiz_content

    except Exception as e:
        print(f"Error calling Bedrock: {str(e)}")

        # Fallback to template quiz
        return generate_fallback_quiz(subject, topic, difficulty, num_questions)


def generate_fallback_quiz(subject: str, topic: str, difficulty: str, num_questions: int) -> Dict[str, Any]:
    """
    Generate fallback quiz when Bedrock is unavailable
    """

    # Sample questions based on difficulty
    sample_questions = {
        'easy': [
            {
                "questionNumber": 1,
                "question": f"What is {topic}?",
                "options": [
                    "A biological process",
                    "A chemical reaction",
                    "A physical phenomenon",
                    "None of the above"
                ],
                "correctAnswer": 0,
                "explanation": f"{topic} is a fundamental concept in {subject}.",
                "difficulty": "easy",
                "topic": topic
            }
        ],
        'medium': [
            {
                "questionNumber": 1,
                "question": f"How does {topic} work?",
                "options": [
                    "Through multiple steps",
                    "Through a single step",
                    "It doesn't work",
                    "Unknown process"
                ],
                "correctAnswer": 0,
                "explanation": f"{topic} typically involves multiple coordinated steps.",
                "difficulty": "medium",
                "topic": topic
            }
        ],
        'hard': [
            {
                "questionNumber": 1,
                "question": f"What are the advanced implications of {topic}?",
                "options": [
                    "Multiple complex outcomes",
                    "Single simple outcome",
                    "No outcomes",
                    "Unpredictable results"
                ],
                "correctAnswer": 0,
                "explanation": f"Advanced study of {topic} reveals complex interconnections.",
                "difficulty": "hard",
                "topic": topic
            }
        ]
    }

    questions = sample_questions.get(difficulty, sample_questions['medium']) * num_questions
    questions = questions[:num_questions]

    # Update question numbers
    for i, q in enumerate(questions, 1):
        q['questionNumber'] = i

    return {
        "subject": subject,
        "topic": topic,
        "difficulty": difficulty,
        "totalQuestions": num_questions,
        "estimatedTime": f"{num_questions * 2} minutes",
        "questions": questions,
        "generatedBy": "Fallback Template (Bedrock unavailable)",
        "generatedAt": datetime.utcnow().isoformat()
    }
