#!/bin/bash

API_ID="ojbjxbk9bg"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="837133224947"

# Function to create integration and route
create_route() {
    local FUNCTION_NAME=$1
    local ROUTE_KEY=$2
    
    echo "Creating route: ${ROUTE_KEY}"
    
    # Create integration
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id "${API_ID}" \
        --integration-type AWS_PROXY \
        --integration-uri "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}" \
        --payload-format-version "2.0" \
        --region "${AWS_REGION}" \
        --query 'IntegrationId' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$INTEGRATION_ID" ]; then
        # Create route
        aws apigatewayv2 create-route \
            --api-id "${API_ID}" \
            --route-key "${ROUTE_KEY}" \
            --target "integrations/${INTEGRATION_ID}" \
            --region "${AWS_REGION}" > /dev/null 2>&1
        
        # Grant permission to API Gateway
        aws lambda add-permission \
            --function-name "${FUNCTION_NAME}" \
            --statement-id "apigateway-invoke-$(date +%s)" \
            --action lambda:InvokeFunction \
            --principal apigateway.amazonaws.com \
            --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
            --region "${AWS_REGION}" \
            2>/dev/null || echo " (Permission already exists)"
        
        echo "✓ Route created: ${ROUTE_KEY}"
    fi
}

# Create all routes
create_route "SmartTutor-LessonGenerator" "POST /student/lesson/generate"
create_route "SmartTutor-QuizGenerator" "POST /student/quiz/generate"
create_route "SmartTutor-ChatTutor" "POST /student/chat"
create_route "SmartTutor-QuizEvaluator" "POST /student/quiz/submit"
create_route "SmartTutor-GetQuizResults" "GET /teacher/quiz/results"

echo ""
echo "✅ All API routes created successfully!"
