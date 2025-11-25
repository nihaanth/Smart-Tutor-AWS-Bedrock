"""
SmartTutor - Chat Tutor Lambda Function
Provides conversational tutoring using Amazon Bedrock (Claude 3 Sonnet)
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
CHAT_TABLE = os.environ.get('CHAT_TABLE', 'SmartTutor-ChatSessions')

def lambda_handler(event, context):
    """
    Main Lambda handler for chat tutor
    """
    try:
        # Parse request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)

        print(f"Received chat request: {json.dumps(body)}")

        # Extract parameters
        student_id = body.get('studentId', 'student_001')
        session_id = body.get('sessionId', f"session_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
        user_message = body.get('message', '')
        conversation_history = body.get('conversationHistory', [])
        subject = body.get('subject', 'General')
        topic = body.get('topic', None)

        if not user_message:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Message is required'})
            }

        # Generate response using Claude 3 Sonnet
        tutor_response = generate_tutor_response(
            user_message, conversation_history, subject, topic
        )

        # Update conversation history
        conversation_history.append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.utcnow().isoformat()
        })
        conversation_history.append({
            'role': 'assistant',
            'content': tutor_response,
            'timestamp': datetime.utcnow().isoformat()
        })

        # Store conversation to S3
        s3_key = f"chat-sessions/{student_id}/{session_id}.json"
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps({
                'sessionId': session_id,
                'studentId': student_id,
                'subject': subject,
                'topic': topic,
                'conversationHistory': conversation_history,
                'updatedAt': datetime.utcnow().isoformat()
            }, indent=2),
            ContentType='application/json'
        )

        # Update DynamoDB
        table = dynamodb.Table(CHAT_TABLE)
        table.put_item(
            Item={
                'sessionId': session_id,
                'studentId': student_id,
                'subject': subject,
                'topic': topic or 'General',
                's3Key': s3_key,
                'messageCount': len(conversation_history),
                'lastMessageAt': datetime.utcnow().isoformat(),
                'createdAt': datetime.utcnow().isoformat()
            }
        )

        print(f"Chat session updated: {session_id}")

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
                'sessionId': session_id,
                'response': tutor_response,
                'conversationHistory': conversation_history,
                'timestamp': datetime.utcnow().isoformat()
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
                'message': 'Failed to process chat request'
            })
        }


def generate_tutor_response(user_message: str, conversation_history: List[Dict],
                            subject: str, topic: str = None) -> str:
    """
    Generate tutor response using Claude 3 Sonnet
    """

    # Build system prompt
    system_prompt = f"""You are SmartTutor, an AI teaching assistant helping students learn {subject}.

Your role:
- Provide clear, patient explanations
- Ask guiding questions to help students think
- Encourage critical thinking
- Provide examples and analogies
- Be supportive and encouraging
- Adapt explanations to the student's level
{f"- Focus on the topic: {topic}" if topic else ""}

Guidelines:
- Never give direct answers to homework problems
- Instead, guide students to discover answers themselves
- Use the Socratic method when appropriate
- Provide hints and break down complex problems
- Celebrate student progress and effort
- Keep responses concise but thorough (2-4 paragraphs)
"""

    # Build conversation messages for Claude
    messages = []

    # Add conversation history
    for msg in conversation_history[-10:]:  # Last 10 messages for context
        if msg['role'] in ['user', 'assistant']:
            messages.append({
                'role': msg['role'],
                'content': msg['content']
            })

    # Add current user message
    messages.append({
        'role': 'user',
        'content': user_message
    })

    try:
        # Call Claude 3 Sonnet via Bedrock
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "temperature": 0.7,
            "system": system_prompt,
            "messages": messages
        }

        print("Calling Amazon Bedrock (Claude 3 Sonnet) for chat...")
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-sonnet-20240229-v1:0',
            body=json.dumps(request_body)
        )

        # Parse response
        response_body = json.loads(response['body'].read())
        tutor_response = response_body['content'][0]['text']

        print("Chat response generated successfully")
        return tutor_response

    except Exception as e:
        print(f"Error calling Bedrock: {str(e)}")

        # Fallback response
        if 'what' in user_message.lower() or 'how' in user_message.lower():
            return f"That's a great question about {topic or subject}! Let me help you understand this concept. To guide your thinking, consider breaking down the problem into smaller parts. What do you already know about this topic? What specific part is confusing you?"
        else:
            return f"I'm here to help you learn about {topic or subject}! Could you tell me more about what you'd like to understand? Feel free to ask specific questions, and I'll guide you through the concepts step by step."
