"""
SmartTutor - Teacher Lesson Plan Generator Lambda Function
Layer 2: GenAI Processing Pipeline

This Lambda function generates weekly lesson plans using Amazon Bedrock (Claude 3 Sonnet).
It's triggered when teachers click "Regenerate Plan" on the teacher dashboard.
"""

import json
import boto3
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Initialize AWS clients
# boto3 automatically uses the Lambda execution environment's region
bedrock_runtime = boto3.client('bedrock-runtime')
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Configuration
CLAUDE_MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1'
S3_BUCKET = os.environ.get('SMARTTUTOR_BUCKET', 'smarttutor-content')
LESSON_PLANS_TABLE = os.environ.get('LESSON_PLANS_TABLE', 'SmartTutor-LessonPlans')


def lambda_handler(event, context):
    """
    Main Lambda handler for lesson plan generation

    Expected event structure:
    {
        "teacherId": "teacher_001",
        "classId": "class_8A",
        "subject": "Biology",
        "weekStartDate": "2025-11-24",
        "studentData": {
            "totalStudents": 25,
            "weakTopics": ["Photosynthesis", "Cell Division"],
            "averagePerformance": 72.5,
            "difficultyDistribution": {
                "easy": 8,
                "medium": 12,
                "hard": 5
            }
        }
    }
    """

    try:
        # Parse request
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event

        teacher_id = body.get('teacherId', 'teacher_001')
        class_id = body.get('classId', 'class_8A')
        subject = body.get('subject', 'Biology')
        week_start = body.get('weekStartDate', datetime.now().strftime('%Y-%m-%d'))
        student_data = body.get('studentData', get_default_student_data())

        print(f"Generating lesson plan for {teacher_id}, class {class_id}, subject {subject}")

        # Generate lesson plan using Bedrock
        lesson_plan = generate_lesson_plan_with_bedrock(
            subject=subject,
            week_start_date=week_start,
            student_data=student_data
        )

        # Store lesson plan to S3 and DynamoDB
        plan_id = store_lesson_plan(
            teacher_id=teacher_id,
            class_id=class_id,
            subject=subject,
            lesson_plan=lesson_plan,
            week_start=week_start
        )

        # Return response
        response = {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',  # Enable CORS
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'success': True,
                'planId': plan_id,
                'lessonPlan': lesson_plan,
                'generatedAt': datetime.now().isoformat(),
                'message': 'Weekly lesson plan generated successfully'
            })
        }

        return response

    except Exception as e:
        print(f"Error generating lesson plan: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate lesson plan'
            })
        }


def generate_lesson_plan_with_bedrock(subject: str, week_start_date: str, student_data: Dict) -> Dict:
    """
    Generate weekly lesson plan using Amazon Bedrock Claude 3 Sonnet
    """

    # Calculate week dates
    week_start = datetime.strptime(week_start_date, '%Y-%m-%d')
    week_days = [(week_start + timedelta(days=i)).strftime('%A, %B %d') for i in range(5)]

    # Build prompt for Claude 3 Sonnet
    prompt = f"""You are an expert educational planner creating a weekly lesson plan for a {subject} class.

**Class Context:**
- Subject: {subject}
- Week: {week_days[0]} - {week_days[4]}
- Total Students: {student_data['totalStudents']}
- Average Performance: {student_data['averagePerformance']}%
- Weak Topics Identified: {', '.join(student_data['weakTopics'])}
- Difficulty Distribution:
  - Easy Level: {student_data['difficultyDistribution']['easy']} students
  - Medium Level: {student_data['difficultyDistribution']['medium']} students
  - Hard Level: {student_data['difficultyDistribution']['hard']} students

**Task:**
Generate a structured 5-day lesson plan that:
1. Addresses the identified weak topics ({', '.join(student_data['weakTopics'])})
2. Provides differentiated instruction for the three difficulty levels
3. Includes specific learning objectives for each day
4. Suggests hands-on activities and assessment methods
5. Builds progressively throughout the week

**Output Format (JSON):**
Return a valid JSON object with this exact structure:
{{
  "weekOverview": "Brief 2-3 sentence overview of the week's focus",
  "weeklyGoals": ["Goal 1", "Goal 2", "Goal 3"],
  "dailyLessons": [
    {{
      "day": "Monday",
      "date": "{week_days[0]}",
      "topic": "Main topic for the day",
      "learningObjectives": ["Objective 1", "Objective 2"],
      "activities": [
        {{"time": "10 min", "activity": "Warm-up activity", "difficulty": "all"}},
        {{"time": "20 min", "activity": "Main lesson", "difficulty": "medium"}},
        {{"time": "15 min", "activity": "Practice", "difficulty": "differentiated"}}
      ],
      "differentiation": {{
        "easy": "Specific support for struggling students",
        "medium": "Standard instruction approach",
        "hard": "Extension activities for advanced students"
      }},
      "assessment": "How to assess understanding",
      "homework": "Brief homework assignment"
    }},
    // ... 4 more days (Tuesday through Friday)
  ],
  "materials": ["Material 1", "Material 2", "Material 3"],
  "notes": "Important notes or considerations for the teacher"
}}

Generate the complete 5-day lesson plan now."""

    # Call Bedrock API
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

    try:
        response = bedrock_runtime.invoke_model(
            modelId=CLAUDE_MODEL_ID,
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        generated_text = response_body['content'][0]['text']

        # Extract JSON from response (handle markdown code blocks)
        if '```json' in generated_text:
            json_start = generated_text.find('```json') + 7
            json_end = generated_text.find('```', json_start)
            json_text = generated_text[json_start:json_end].strip()
        elif '```' in generated_text:
            json_start = generated_text.find('```') + 3
            json_end = generated_text.find('```', json_start)
            json_text = generated_text[json_start:json_end].strip()
        else:
            json_text = generated_text.strip()

        # Parse JSON
        lesson_plan = json.loads(json_text)

        # Add metadata
        lesson_plan['subject'] = subject
        lesson_plan['weekStartDate'] = week_start_date
        lesson_plan['studentContext'] = student_data
        lesson_plan['generatedBy'] = 'Claude 3 Sonnet via Amazon Bedrock'
        lesson_plan['generatedAt'] = datetime.now().isoformat()

        return lesson_plan

    except Exception as e:
        print(f"Bedrock API error: {str(e)}")
        # Return fallback plan if Bedrock fails
        return generate_fallback_lesson_plan(subject, week_start_date, week_days, student_data)


def store_lesson_plan(teacher_id: str, class_id: str, subject: str, lesson_plan: Dict, week_start: str) -> str:
    """
    Store generated lesson plan to S3 and DynamoDB
    """

    plan_id = f"{teacher_id}_{class_id}_{subject}_{week_start}".replace(' ', '_')

    try:
        # Store to S3
        s3_key = f"lesson-plans/{teacher_id}/{class_id}/{plan_id}.json"
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(lesson_plan, indent=2),
            ContentType='application/json',
            Metadata={
                'teacher-id': teacher_id,
                'class-id': class_id,
                'subject': subject,
                'week-start': week_start
            }
        )
        print(f"Lesson plan stored to S3: s3://{S3_BUCKET}/{s3_key}")

        # Store metadata to DynamoDB
        try:
            table = dynamodb.Table(LESSON_PLANS_TABLE)
            table.put_item(
                Item={
                    'planId': plan_id,
                    'teacherId': teacher_id,
                    'classId': class_id,
                    'subject': subject,
                    'weekStartDate': week_start,
                    's3Location': f"s3://{S3_BUCKET}/{s3_key}",
                    'status': 'pending_review',  # Teacher needs to approve
                    'createdAt': datetime.now().isoformat(),
                    'weekOverview': lesson_plan.get('weekOverview', ''),
                    'weeklyGoals': lesson_plan.get('weeklyGoals', [])
                }
            )
            print(f"Lesson plan metadata stored to DynamoDB: {plan_id}")
        except Exception as db_error:
            print(f"DynamoDB storage failed (non-critical): {str(db_error)}")

        return plan_id

    except Exception as e:
        print(f"Storage error: {str(e)}")
        raise


def generate_fallback_lesson_plan(subject: str, week_start_date: str, week_days: List[str], student_data: Dict) -> Dict:
    """
    Generate a fallback lesson plan if Bedrock is unavailable
    """

    return {
        "weekOverview": f"This week in {subject}, students will review key concepts and address weak areas identified in recent assessments.",
        "weeklyGoals": [
            f"Strengthen understanding of {student_data['weakTopics'][0] if student_data['weakTopics'] else 'core concepts'}",
            "Build confidence through differentiated practice",
            "Prepare for upcoming assessments"
        ],
        "dailyLessons": [
            {
                "day": "Monday",
                "date": week_days[0],
                "topic": f"Introduction to {student_data['weakTopics'][0] if student_data['weakTopics'] else subject}",
                "learningObjectives": [
                    "Review prerequisite knowledge",
                    "Introduce new concepts with scaffolding"
                ],
                "activities": [
                    {"time": "10 min", "activity": "Prior knowledge assessment", "difficulty": "all"},
                    {"time": "25 min", "activity": "Direct instruction with examples", "difficulty": "medium"},
                    {"time": "15 min", "activity": "Guided practice", "difficulty": "differentiated"}
                ],
                "differentiation": {
                    "easy": "Provide visual aids and step-by-step guides",
                    "medium": "Standard examples with peer discussion",
                    "hard": "Challenge problems and independent exploration"
                },
                "assessment": "Exit ticket with 3 quick questions",
                "homework": "Practice worksheet (differentiated by level)"
            },
            {
                "day": "Tuesday",
                "date": week_days[1],
                "topic": "Deep Dive and Application",
                "learningObjectives": [
                    "Apply concepts to real-world scenarios",
                    "Develop problem-solving strategies"
                ],
                "activities": [
                    {"time": "10 min", "activity": "Review homework and questions", "difficulty": "all"},
                    {"time": "20 min", "activity": "Hands-on activity or lab", "difficulty": "differentiated"},
                    {"time": "20 min", "activity": "Small group work", "difficulty": "differentiated"}
                ],
                "differentiation": {
                    "easy": "Structured worksheets with support",
                    "medium": "Semi-structured group tasks",
                    "hard": "Open-ended investigation"
                },
                "assessment": "Group presentation or poster",
                "homework": "Reflection journal on activity"
            },
            {
                "day": "Wednesday",
                "date": week_days[2],
                "topic": "Practice and Consolidation",
                "learningObjectives": [
                    "Master key skills through repeated practice",
                    "Identify and correct common mistakes"
                ],
                "activities": [
                    {"time": "10 min", "activity": "Warm-up review game", "difficulty": "all"},
                    {"time": "25 min", "activity": "Stations or centers", "difficulty": "differentiated"},
                    {"time": "15 min", "activity": "Individual practice", "difficulty": "differentiated"}
                ],
                "differentiation": {
                    "easy": "Foundational skill practice with immediate feedback",
                    "medium": "Mixed difficulty problems",
                    "hard": "Complex multi-step challenges"
                },
                "assessment": "Formative quiz (5 questions)",
                "homework": "Error analysis from quiz"
            },
            {
                "day": "Thursday",
                "date": week_days[3],
                "topic": "Extension and Connection",
                "learningObjectives": [
                    "Connect concepts to other topics",
                    "Explore advanced applications"
                ],
                "activities": [
                    {"time": "10 min", "activity": "Cross-curricular connection", "difficulty": "all"},
                    {"time": "25 min", "activity": "Project work or investigation", "difficulty": "differentiated"},
                    {"time": "15 min", "activity": "Peer teaching and sharing", "difficulty": "all"}
                ],
                "differentiation": {
                    "easy": "Guided project with templates",
                    "medium": "Semi-independent project",
                    "hard": "Research-based deep dive"
                },
                "assessment": "Project check-in and feedback",
                "homework": "Continue project work"
            },
            {
                "day": "Friday",
                "date": week_days[4],
                "topic": "Assessment and Reflection",
                "learningObjectives": [
                    "Demonstrate mastery of weekly content",
                    "Reflect on learning and set goals"
                ],
                "activities": [
                    {"time": "30 min", "activity": "Weekly assessment (quiz or test)", "difficulty": "differentiated"},
                    {"time": "15 min", "activity": "Self-reflection and goal setting", "difficulty": "all"},
                    {"time": "5 min", "activity": "Preview next week", "difficulty": "all"}
                ],
                "differentiation": {
                    "easy": "Modified assessment with support",
                    "medium": "Standard assessment",
                    "hard": "Extended response questions"
                },
                "assessment": "Weekly summative assessment",
                "homework": "Weekend review and preparation for next week"
            }
        ],
        "materials": [
            "Textbook and workbook",
            "Visual aids and diagrams",
            "Digital resources and videos",
            "Lab materials (if applicable)",
            "Assessment templates"
        ],
        "notes": f"Focus on addressing weak topic: {student_data['weakTopics'][0] if student_data['weakTopics'] else 'N/A'}. Provide extra support for {student_data['difficultyDistribution']['easy']} students at easy level.",
        "subject": subject,
        "weekStartDate": week_start_date,
        "studentContext": student_data,
        "generatedBy": "Fallback Template",
        "generatedAt": datetime.now().isoformat()
    }


def get_default_student_data() -> Dict:
    """
    Return default student data for testing
    """
    return {
        "totalStudents": 25,
        "weakTopics": ["Photosynthesis", "Cell Division"],
        "averagePerformance": 72.5,
        "difficultyDistribution": {
            "easy": 8,
            "medium": 12,
            "hard": 5
        }
    }


# For local testing
if __name__ == "__main__":
    # Test event
    test_event = {
        "teacherId": "teacher_001",
        "classId": "class_8A",
        "subject": "Biology",
        "weekStartDate": "2025-11-25",
        "studentData": get_default_student_data()
    }

    result = lambda_handler(test_event, None)
    print(json.dumps(json.loads(result['body']), indent=2))
