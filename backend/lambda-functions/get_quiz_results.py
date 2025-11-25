"""
SmartTutor - Get Quiz Results Lambda Function
Fetches student quiz results for teacher dashboard
"""

import json
import boto3
import os
from datetime import datetime
from typing import Dict, List, Any
from boto3.dynamodb.conditions import Key
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
    Main Lambda handler to fetch quiz results

    Query parameters:
    - studentId: Filter by specific student (optional)
    - subject: Filter by subject (optional)
    - limit: Number of results to return (default: 50)
    """
    try:
        # Parse query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        student_id = query_params.get('studentId')
        subject = query_params.get('subject')
        limit = int(query_params.get('limit', 50))

        print(f"Fetching quiz results - studentId: {student_id}, subject: {subject}, limit: {limit}")

        table = dynamodb.Table(QUIZ_RESULTS_TABLE)

        # Fetch results based on parameters
        if student_id:
            # Query by student using GSI
            response = table.query(
                IndexName='StudentIndex',
                KeyConditionExpression=Key('studentId').eq(student_id),
                Limit=limit,
                ScanIndexForward=False  # Most recent first
            )
        else:
            # Scan all results (for teacher dashboard overview)
            response = table.scan(Limit=limit)

        results = response.get('Items', [])

        # Filter by subject if specified
        if subject:
            results = [r for r in results if r.get('subject') == subject]

        # Sort by submission date (most recent first)
        results.sort(key=lambda x: x.get('submittedAt', ''), reverse=True)

        # Calculate statistics
        stats = calculate_statistics(results)

        # Return response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'count': len(results),
                'results': results,
                'statistics': stats,
                'message': f'Retrieved {len(results)} quiz results'
            }, default=decimal_default)
        }

    except Exception as e:
        print(f"Error fetching quiz results: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'error': str(e),
                'message': 'Failed to fetch quiz results'
            }, default=decimal_default)
        }


def calculate_statistics(results: List[Dict]) -> Dict[str, Any]:
    """
    Calculate aggregate statistics from quiz results
    """
    if not results:
        return {
            'totalQuizzes': 0,
            'averageScore': 0,
            'passRate': 0,
            'totalStudents': 0
        }

    total_quizzes = len(results)

    # Calculate average percentage
    percentages = [float(r.get('percentage', 0)) for r in results]
    average_score = sum(percentages) / len(percentages) if percentages else 0

    # Calculate pass rate
    passed = sum(1 for r in results if r.get('passed', False))
    pass_rate = (passed / total_quizzes * 100) if total_quizzes > 0 else 0

    # Count unique students
    unique_students = len(set(r.get('studentId') for r in results))

    # Subject breakdown
    subject_stats = {}
    for result in results:
        subject = result.get('subject', 'Unknown')
        if subject not in subject_stats:
            subject_stats[subject] = {
                'count': 0,
                'totalScore': 0,
                'passed': 0
            }
        subject_stats[subject]['count'] += 1
        subject_stats[subject]['totalScore'] += float(result.get('percentage', 0))
        if result.get('passed', False):
            subject_stats[subject]['passed'] += 1

    # Calculate averages for each subject
    for subject, stats in subject_stats.items():
        stats['averageScore'] = stats['totalScore'] / stats['count'] if stats['count'] > 0 else 0
        stats['passRate'] = (stats['passed'] / stats['count'] * 100) if stats['count'] > 0 else 0

    # Recent activity (last 7 days)
    from datetime import datetime, timedelta
    seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
    recent_quizzes = sum(1 for r in results if r.get('submittedAt', '') >= seven_days_ago)

    return {
        'totalQuizzes': total_quizzes,
        'averageScore': round(average_score, 2),
        'passRate': round(pass_rate, 2),
        'totalStudents': unique_students,
        'recentQuizzes': recent_quizzes,
        'subjectBreakdown': subject_stats
    }


# For local testing
if __name__ == "__main__":
    # Test event
    test_event = {
        'queryStringParameters': {
            'limit': '10'
        }
    }

    result = lambda_handler(test_event, None)
    print(json.dumps(json.loads(result['body']), indent=2))
