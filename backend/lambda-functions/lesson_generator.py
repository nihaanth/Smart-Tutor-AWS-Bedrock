"""
SmartTutor - Lesson Generator Lambda Function
Generates personalized lesson content using Amazon Bedrock (Claude 3 Sonnet)
"""

import json
import boto3
import os
from datetime import datetime
from typing import Dict, Any

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Configuration
S3_BUCKET = os.environ.get('SMARTTUTOR_BUCKET', 'smarttutor-content-dev')
LESSONS_TABLE = os.environ.get('LESSONS_TABLE', 'SmartTutor-Lessons')

def lambda_handler(event, context):
    """
    Main Lambda handler for lesson generation
    """
    try:
        # Parse request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)

        print(f"Received request: {json.dumps(body)}")

        # Extract parameters
        student_id = body.get('studentId', 'student_001')
        subject = body.get('subject', 'Biology')
        topic = body.get('topic', 'Photosynthesis')
        difficulty = body.get('difficulty', 'medium')
        student_performance = body.get('studentPerformance', {})

        # Generate lesson using Bedrock
        lesson_content = generate_lesson_with_bedrock(
            subject, topic, difficulty, student_performance
        )

        # Create unique lesson ID
        lesson_id = f"{student_id}_{subject}_{topic}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        # Store lesson to S3
        s3_key = f"lessons/{student_id}/{lesson_id}.json"
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(lesson_content, indent=2),
            ContentType='application/json'
        )

        # Store metadata to DynamoDB
        table = dynamodb.Table(LESSONS_TABLE)
        table.put_item(
            Item={
                'lessonId': lesson_id,
                'studentId': student_id,
                'subject': subject,
                'topic': topic,
                'difficulty': difficulty,
                's3Key': s3_key,
                'createdAt': datetime.utcnow().isoformat(),
                'status': 'generated'
            }
        )

        print(f"Lesson generated and stored: {lesson_id}")

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
                'lessonId': lesson_id,
                'lesson': lesson_content,
                'generatedAt': datetime.utcnow().isoformat(),
                'message': 'Lesson generated successfully'
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
                'message': 'Failed to generate lesson'
            })
        }


def generate_lesson_with_bedrock(subject: str, topic: str, difficulty: str,
                                  student_performance: Dict) -> Dict[str, Any]:
    """
    Generate personalized lesson content using Claude 3 Sonnet
    """

    # Map difficulty levels
    difficulty_descriptions = {
        'easy': 'beginner level with simple explanations and visual aids',
        'medium': 'intermediate level with moderate complexity',
        'hard': 'advanced level with detailed explanations and complex concepts'
    }

    difficulty_desc = difficulty_descriptions.get(difficulty, 'intermediate level')

    # Build prompt for Claude
    prompt = f"""You are an expert educator creating personalized lesson content for a student.

**Lesson Details:**
- Subject: {subject}
- Topic: {topic}
- Difficulty Level: {difficulty.upper()} ({difficulty_desc})
- Student's Average Score: {student_performance.get('averageScore', 75)}%
- Lessons Completed: {student_performance.get('lessonsCompleted', 0)}

**Task:**
Create engaging, personalized lesson content that:
1. Matches the student's difficulty level
2. Builds on their current knowledge
3. Includes clear learning objectives
4. Provides practical examples and applications
5. Includes interactive elements

**Required Output Format (JSON):**
{{
    "topic": "{topic}",
    "subject": "{subject}",
    "difficulty": "{difficulty}",
    "estimatedTime": "XX minutes",
    "learningObjectives": [
        "Objective 1",
        "Objective 2",
        "Objective 3"
    ],
    "introduction": "Engaging introduction paragraph...",
    "keyConcepts": [
        {{
            "title": "Concept 1",
            "explanation": "Clear explanation...",
            "example": "Real-world example..."
        }},
        {{
            "title": "Concept 2",
            "explanation": "Clear explanation...",
            "example": "Real-world example..."
        }}
    ],
    "practiceQuestions": [
        {{
            "question": "Question text",
            "type": "multiple_choice",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": 0,
            "explanation": "Why this is correct..."
        }}
    ],
    "summary": "Brief summary of key takeaways...",
    "nextSteps": "What the student should study next..."
}}

Generate comprehensive, engaging content appropriate for a {difficulty} level student."""

    try:
        # Call Claude 3 Sonnet via Bedrock
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "temperature": 0.7,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        print("Calling Amazon Bedrock (Claude 3 Sonnet)...")
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps(request_body)
        )

        # Parse response
        response_body = json.loads(response['body'].read())
        content_text = response_body['content'][0]['text']

        # Extract JSON from response
        # Claude might wrap JSON in markdown code blocks
        if '```json' in content_text:
            json_start = content_text.find('```json') + 7
            json_end = content_text.find('```', json_start)
            content_text = content_text[json_start:json_end].strip()
        elif '```' in content_text:
            json_start = content_text.find('```') + 3
            json_end = content_text.find('```', json_start)
            content_text = content_text[json_start:json_end].strip()

        lesson_content = json.loads(content_text)

        # Add metadata
        lesson_content['generatedBy'] = 'Claude 3 Sonnet via Amazon Bedrock'
        lesson_content['generatedAt'] = datetime.utcnow().isoformat()
        lesson_content['subject'] = subject
        lesson_content['topic'] = topic
        lesson_content['difficulty'] = difficulty

        print("Lesson content generated successfully")
        return lesson_content

    except Exception as e:
        print(f"Error calling Bedrock: {str(e)}")

        # Fallback template
        return {
            "topic": topic,
            "subject": subject,
            "difficulty": difficulty,
            "estimatedTime": "30 minutes",
            "learningObjectives": [
                f"Understand the fundamental concepts of {topic}",
                f"Apply knowledge to real-world scenarios",
                f"Practice problem-solving skills"
            ],
            "introduction": f"Welcome to this lesson on {topic}! This lesson is tailored to your {difficulty} level.",
            "keyConcepts": [
                {
                    "title": f"Introduction to {topic}",
                    "explanation": f"This is a {difficulty}-level overview of {topic} in {subject}.",
                    "example": "Practical examples would be provided here."
                }
            ],
            "practiceQuestions": [
                {
                    "question": f"What is the main concept of {topic}?",
                    "type": "multiple_choice",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": 0,
                    "explanation": "Explanation would be provided here."
                }
            ],
            "summary": f"You've learned the basics of {topic} at a {difficulty} level.",
            "nextSteps": "Continue practicing and exploring advanced topics.",
            "generatedBy": "Fallback Template (Bedrock unavailable)",
            "generatedAt": datetime.utcnow().isoformat()
        }
