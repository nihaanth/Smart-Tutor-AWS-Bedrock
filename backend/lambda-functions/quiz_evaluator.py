"""
SmartTutor - Quiz Evaluator Lambda Function
Evaluates student quiz submissions and stores results
"""

import json
import boto3
import os
from datetime import datetime
from typing import Dict, Any, List
from decimal import Decimal

# Helper function to convert DynamoDB Decimal to native Python types
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

# Initialize AWS clients
s3 = boto3.client('s3')
# DynamoDB tables are in us-east-2 region
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')

# Configuration
S3_BUCKET = os.environ.get('SMARTTUTOR_BUCKET', 'smarttutor-content-dev')
QUIZ_RESULTS_TABLE = os.environ.get('QUIZ_RESULTS_TABLE', 'SmartTutor-QuizResults')

def lambda_handler(event, context):
    """
    Main Lambda handler for quiz submission and evaluation
    """
    try:
        # Parse request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)

        print(f"Received quiz submission: {json.dumps(body)}")

        # Extract parameters
        student_id = body.get('studentId', 'student_001')
        quiz_id = body.get('quizId')
        subject = body.get('subject')
        topic = body.get('topic')
        student_answers = body.get('answers', [])  # List of answer indices
        correct_answers = body.get('correctAnswers', [])  # From quiz generation
        questions = body.get('questions', [])

        if not quiz_id or not student_answers:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'success': False,
                    'error': 'Missing required fields: quizId and answers'
                })
            }

        # Evaluate quiz
        evaluation_result = evaluate_quiz(student_answers, correct_answers, questions)

        # Create result ID
        result_id = f"{student_id}_{quiz_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

        # Prepare result object
        quiz_result = {
            'resultId': result_id,
            'studentId': student_id,
            'quizId': quiz_id,
            'subject': subject,
            'topic': topic,
            'totalQuestions': len(questions),
            'correctAnswers': evaluation_result['correct_count'],
            'incorrectAnswers': evaluation_result['incorrect_count'],
            'score': evaluation_result['score'],
            'percentage': evaluation_result['percentage'],
            'answers': evaluation_result['detailed_answers'],
            'submittedAt': datetime.utcnow().isoformat(),
            'passed': evaluation_result['percentage'] >= 70  # 70% passing grade
        }

        # Store to S3
        s3_key = f"quiz-results/{student_id}/{result_id}.json"
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(quiz_result, indent=2),
            ContentType='application/json'
        )
        print(f"Quiz result stored to S3: s3://{S3_BUCKET}/{s3_key}")

        # Store to DynamoDB
        table = dynamodb.Table(QUIZ_RESULTS_TABLE)
        table.put_item(
            Item={
                'resultId': result_id,
                'studentId': student_id,
                'quizId': quiz_id,
                'subject': subject,
                'topic': topic,
                'score': str(evaluation_result['score']),
                'percentage': str(evaluation_result['percentage']),
                'totalQuestions': evaluation_result['total_questions'],
                'correctAnswers': evaluation_result['correct_count'],
                'passed': evaluation_result['percentage'] >= 70,
                's3Location': f"s3://{S3_BUCKET}/{s3_key}",
                'submittedAt': datetime.utcnow().isoformat()
            }
        )
        print(f"Quiz result metadata stored to DynamoDB: {result_id}")

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
                'resultId': result_id,
                'result': quiz_result,
                'message': f'Quiz evaluated: {evaluation_result["correct_count"]}/{evaluation_result["total_questions"]} correct'
            }, default=decimal_default)
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
                'message': 'Failed to evaluate quiz'
            }, default=decimal_default)
        }


def evaluate_quiz(student_answers: List[int], correct_answers: List[int], questions: List[Dict]) -> Dict[str, Any]:
    """
    Evaluate student's quiz answers
    """
    total_questions = len(questions)
    correct_count = 0
    incorrect_count = 0
    detailed_answers = []

    for i, (student_answer, correct_answer, question) in enumerate(zip(student_answers, correct_answers, questions)):
        is_correct = student_answer == correct_answer

        if is_correct:
            correct_count += 1
        else:
            incorrect_count += 1

        detailed_answers.append({
            'questionNumber': i + 1,
            'question': question.get('question', ''),
            'studentAnswer': student_answer,
            'correctAnswer': correct_answer,
            'isCorrect': is_correct,
            'explanation': question.get('explanation', '')
        })

    percentage = (correct_count / total_questions * 100) if total_questions > 0 else 0

    return {
        'total_questions': total_questions,
        'correct_count': correct_count,
        'incorrect_count': incorrect_count,
        'score': f"{correct_count}/{total_questions}",
        'percentage': round(percentage, 2),
        'detailed_answers': detailed_answers
    }
