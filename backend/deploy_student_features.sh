#!/bin/bash

###############################################################################
# SmartTutor Student Features Deployment Script
# Deploys student-focused Lambda functions and API routes
###############################################################################

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║      SmartTutor Student Features Deployment to AWS               ║"
echo "║                                                                  ║"
echo "║  - Lesson Generator (Claude 3 Sonnet)                            ║"
echo "║  - Quiz Generator (Llama 3 70B)                                  ║"
echo "║  - Chat Tutor (Claude 3 Sonnet)                                  ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
PROJECT_NAME="SmartTutor"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
S3_BUCKET="smarttutor-content-${ENVIRONMENT}"
LAMBDA_ROLE_NAME="SmartTutor-LambdaExecutionRole"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

###############################################################################
# Step 1: Prerequisites Check
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 1: Checking Prerequisites"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check if base deployment exists
if [ ! -f "deployment-info.json" ]; then
    log_error "Base deployment not found. Please run deploy_backend.sh first."
    exit 1
fi

# Load existing deployment info
API_ID=$(cat deployment-info.json | python3 -c "import sys, json; print(json.load(sys.stdin)['apiId'])" 2>/dev/null || echo "")
LAMBDA_ROLE_ARN=$(cat deployment-info.json | python3 -c "import sys, json; print(json.load(sys.stdin)['lambdaRoleArn'])" 2>/dev/null || echo "")
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$API_ID" ] || [ -z "$LAMBDA_ROLE_ARN" ]; then
    log_error "Could not read deployment info. Please run deploy_backend.sh first."
    exit 1
fi

log_info "✓ Base deployment found"
log_info "✓ API ID: $API_ID"
log_info "✓ AWS Region: $AWS_REGION"

###############################################################################
# Step 2: Create Additional DynamoDB Tables
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 2: Creating DynamoDB Tables for Student Features"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Lessons Table
LESSONS_TABLE="${PROJECT_NAME}-Lessons"
if ! aws dynamodb describe-table --table-name "${LESSONS_TABLE}" &> /dev/null; then
    log_info "Creating table: ${LESSONS_TABLE}"

    aws dynamodb create-table \
        --table-name "${LESSONS_TABLE}" \
        --attribute-definitions \
            AttributeName=lessonId,AttributeType=S \
            AttributeName=studentId,AttributeType=S \
        --key-schema \
            AttributeName=lessonId,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=StudentIndex,KeySchema=[{AttributeName=studentId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --tags "Key=Project,Value=${PROJECT_NAME}" "Key=Environment,Value=${ENVIRONMENT}"

    log_info "✓ Table created: ${LESSONS_TABLE}"
else
    log_info "✓ Table already exists: ${LESSONS_TABLE}"
fi

# Quizzes Table
QUIZZES_TABLE="${PROJECT_NAME}-Quizzes"
if ! aws dynamodb describe-table --table-name "${QUIZZES_TABLE}" &> /dev/null; then
    log_info "Creating table: ${QUIZZES_TABLE}"

    aws dynamodb create-table \
        --table-name "${QUIZZES_TABLE}" \
        --attribute-definitions \
            AttributeName=quizId,AttributeType=S \
            AttributeName=studentId,AttributeType=S \
        --key-schema \
            AttributeName=quizId,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=StudentIndex,KeySchema=[{AttributeName=studentId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --tags "Key=Project,Value=${PROJECT_NAME}" "Key=Environment,Value=${ENVIRONMENT}"

    log_info "✓ Table created: ${QUIZZES_TABLE}"
else
    log_info "✓ Table already exists: ${QUIZZES_TABLE}"
fi

# Chat Sessions Table
CHAT_TABLE="${PROJECT_NAME}-ChatSessions"
if ! aws dynamodb describe-table --table-name "${CHAT_TABLE}" &> /dev/null; then
    log_info "Creating table: ${CHAT_TABLE}"

    aws dynamodb create-table \
        --table-name "${CHAT_TABLE}" \
        --attribute-definitions \
            AttributeName=sessionId,AttributeType=S \
            AttributeName=studentId,AttributeType=S \
        --key-schema \
            AttributeName=sessionId,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=StudentIndex,KeySchema=[{AttributeName=studentId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --tags "Key=Project,Value=${PROJECT_NAME}" "Key=Environment,Value=${ENVIRONMENT}"

    log_info "✓ Table created: ${CHAT_TABLE}"
else
    log_info "✓ Table already exists: ${CHAT_TABLE}"
fi

# Quiz Results Table
QUIZ_RESULTS_TABLE="${PROJECT_NAME}-QuizResults"
if ! aws dynamodb describe-table --table-name "${QUIZ_RESULTS_TABLE}" &> /dev/null; then
    log_info "Creating table: ${QUIZ_RESULTS_TABLE}"

    aws dynamodb create-table \
        --table-name "${QUIZ_RESULTS_TABLE}" \
        --attribute-definitions \
            AttributeName=resultId,AttributeType=S \
            AttributeName=studentId,AttributeType=S \
        --key-schema \
            AttributeName=resultId,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=StudentIndex,KeySchema=[{AttributeName=studentId,KeyType=HASH}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --tags "Key=Project,Value=${PROJECT_NAME}" "Key=Environment,Value=${ENVIRONMENT}"

    log_info "✓ Table created: ${QUIZ_RESULTS_TABLE}"
else
    log_info "✓ Table already exists: ${QUIZ_RESULTS_TABLE}"
fi

###############################################################################
# Step 3: Deploy Lesson Generator Lambda
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 3: Deploying Lesson Generator Lambda"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

LESSON_GENERATOR_FUNCTION="${PROJECT_NAME}-LessonGenerator"

cd lambda-functions
zip -q lesson_generator.zip lesson_generator.py
log_info "✓ Lambda package created: lesson_generator.zip"

if ! aws lambda get-function --function-name "${LESSON_GENERATOR_FUNCTION}" &> /dev/null; then
    log_info "Creating Lambda function: ${LESSON_GENERATOR_FUNCTION}"

    aws lambda create-function \
        --function-name "${LESSON_GENERATOR_FUNCTION}" \
        --runtime python3.9 \
        --role "${LAMBDA_ROLE_ARN}" \
        --handler lesson_generator.lambda_handler \
        --zip-file fileb://lesson_generator.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},LESSONS_TABLE=${LESSONS_TABLE}}" \
        --description "Generates personalized lessons using Claude 3 Sonnet"

    log_info "✓ Lambda function created: ${LESSON_GENERATOR_FUNCTION}"
else
    log_info "Updating Lambda function: ${LESSON_GENERATOR_FUNCTION}"

    aws lambda update-function-code \
        --function-name "${LESSON_GENERATOR_FUNCTION}" \
        --zip-file fileb://lesson_generator.zip

    aws lambda update-function-configuration \
        --function-name "${LESSON_GENERATOR_FUNCTION}" \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},LESSONS_TABLE=${LESSONS_TABLE}}"

    log_info "✓ Lambda function updated: ${LESSON_GENERATOR_FUNCTION}"
fi

rm lesson_generator.zip
cd - > /dev/null

###############################################################################
# Step 4: Deploy Quiz Generator Lambda
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 4: Deploying Quiz Generator Lambda"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

QUIZ_GENERATOR_FUNCTION="${PROJECT_NAME}-QuizGenerator"

cd lambda-functions
zip -q quiz_generator.zip quiz_generator.py
log_info "✓ Lambda package created: quiz_generator.zip"

if ! aws lambda get-function --function-name "${QUIZ_GENERATOR_FUNCTION}" &> /dev/null; then
    log_info "Creating Lambda function: ${QUIZ_GENERATOR_FUNCTION}"

    aws lambda create-function \
        --function-name "${QUIZ_GENERATOR_FUNCTION}" \
        --runtime python3.9 \
        --role "${LAMBDA_ROLE_ARN}" \
        --handler quiz_generator.lambda_handler \
        --zip-file fileb://quiz_generator.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},QUIZZES_TABLE=${QUIZZES_TABLE}}" \
        --description "Generates quizzes using Llama 3 70B"

    log_info "✓ Lambda function created: ${QUIZ_GENERATOR_FUNCTION}"
else
    log_info "Updating Lambda function: ${QUIZ_GENERATOR_FUNCTION}"

    aws lambda update-function-code \
        --function-name "${QUIZ_GENERATOR_FUNCTION}" \
        --zip-file fileb://quiz_generator.zip

    aws lambda update-function-configuration \
        --function-name "${QUIZ_GENERATOR_FUNCTION}" \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},QUIZZES_TABLE=${QUIZZES_TABLE}}"

    log_info "✓ Lambda function updated: ${QUIZ_GENERATOR_FUNCTION}"
fi

rm quiz_generator.zip
cd - > /dev/null

###############################################################################
# Step 5: Deploy Chat Tutor Lambda
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 5: Deploying Chat Tutor Lambda"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

CHAT_TUTOR_FUNCTION="${PROJECT_NAME}-ChatTutor"

cd lambda-functions
zip -q chat_tutor.zip chat_tutor.py
log_info "✓ Lambda package created: chat_tutor.zip"

if ! aws lambda get-function --function-name "${CHAT_TUTOR_FUNCTION}" &> /dev/null; then
    log_info "Creating Lambda function: ${CHAT_TUTOR_FUNCTION}"

    aws lambda create-function \
        --function-name "${CHAT_TUTOR_FUNCTION}" \
        --runtime python3.9 \
        --role "${LAMBDA_ROLE_ARN}" \
        --handler chat_tutor.lambda_handler \
        --zip-file fileb://chat_tutor.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},CHAT_TABLE=${CHAT_TABLE}}" \
        --description "Conversational AI tutor using Claude 3 Sonnet"

    log_info "✓ Lambda function created: ${CHAT_TUTOR_FUNCTION}"
else
    log_info "Updating Lambda function: ${CHAT_TUTOR_FUNCTION}"

    aws lambda update-function-code \
        --function-name "${CHAT_TUTOR_FUNCTION}" \
        --zip-file fileb://chat_tutor.zip

    aws lambda update-function-configuration \
        --function-name "${CHAT_TUTOR_FUNCTION}" \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},CHAT_TABLE=${CHAT_TABLE}}"

    log_info "✓ Lambda function updated: ${CHAT_TUTOR_FUNCTION}"
fi

rm chat_tutor.zip
cd - > /dev/null

###############################################################################
# Step 6: Deploy Quiz Evaluator Lambda
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 6: Deploying Quiz Evaluator Lambda"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

QUIZ_EVALUATOR_FUNCTION="${PROJECT_NAME}-QuizEvaluator"

cd lambda-functions
zip -q quiz_evaluator.zip quiz_evaluator.py
log_info "✓ Lambda package created: quiz_evaluator.zip"

if ! aws lambda get-function --function-name "${QUIZ_EVALUATOR_FUNCTION}" &> /dev/null; then
    log_info "Creating Lambda function: ${QUIZ_EVALUATOR_FUNCTION}"

    aws lambda create-function \
        --function-name "${QUIZ_EVALUATOR_FUNCTION}" \
        --runtime python3.9 \
        --role "${LAMBDA_ROLE_ARN}" \
        --handler quiz_evaluator.lambda_handler \
        --zip-file fileb://quiz_evaluator.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},QUIZ_RESULTS_TABLE=${QUIZ_RESULTS_TABLE}}" \
        --description "Evaluates student quiz submissions"

    log_info "✓ Lambda function created: ${QUIZ_EVALUATOR_FUNCTION}"
else
    log_info "Updating Lambda function: ${QUIZ_EVALUATOR_FUNCTION}"

    aws lambda update-function-code \
        --function-name "${QUIZ_EVALUATOR_FUNCTION}" \
        --zip-file fileb://quiz_evaluator.zip

    aws lambda update-function-configuration \
        --function-name "${QUIZ_EVALUATOR_FUNCTION}" \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},QUIZ_RESULTS_TABLE=${QUIZ_RESULTS_TABLE}}"

    log_info "✓ Lambda function updated: ${QUIZ_EVALUATOR_FUNCTION}"
fi

rm quiz_evaluator.zip
cd - > /dev/null

###############################################################################
# Step 7: Deploy Get Quiz Results Lambda (Teacher Feature)
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 7: Deploying Get Quiz Results Lambda"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

GET_QUIZ_RESULTS_FUNCTION="${PROJECT_NAME}-GetQuizResults"

cd lambda-functions
zip -q get_quiz_results.zip get_quiz_results.py
log_info "✓ Lambda package created: get_quiz_results.zip"

if ! aws lambda get-function --function-name "${GET_QUIZ_RESULTS_FUNCTION}" &> /dev/null; then
    log_info "Creating Lambda function: ${GET_QUIZ_RESULTS_FUNCTION}"

    aws lambda create-function \
        --function-name "${GET_QUIZ_RESULTS_FUNCTION}" \
        --runtime python3.9 \
        --role "${LAMBDA_ROLE_ARN}" \
        --handler get_quiz_results.lambda_handler \
        --zip-file fileb://get_quiz_results.zip \
        --timeout 60 \
        --memory-size 256 \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},QUIZ_RESULTS_TABLE=${QUIZ_RESULTS_TABLE}}" \
        --description "Fetches student quiz results for teacher dashboard"

    log_info "✓ Lambda function created: ${GET_QUIZ_RESULTS_FUNCTION}"
else
    log_info "Updating Lambda function: ${GET_QUIZ_RESULTS_FUNCTION}"

    aws lambda update-function-code \
        --function-name "${GET_QUIZ_RESULTS_FUNCTION}" \
        --zip-file fileb://get_quiz_results.zip

    aws lambda update-function-configuration \
        --function-name "${GET_QUIZ_RESULTS_FUNCTION}" \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},QUIZ_RESULTS_TABLE=${QUIZ_RESULTS_TABLE}}"

    log_info "✓ Lambda function updated: ${GET_QUIZ_RESULTS_FUNCTION}"
fi

rm get_quiz_results.zip
cd - > /dev/null

###############################################################################
# Step 8: Create API Routes
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 8: Creating API Routes for Student Features"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Function to create integration and route
create_route() {
    local FUNCTION_NAME=$1
    local ROUTE_KEY=$2

    log_info "Creating route: ${ROUTE_KEY}"

    # Create integration
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id "${API_ID}" \
        --integration-type AWS_PROXY \
        --integration-uri "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}" \
        --payload-format-version "2.0" \
        --query 'IntegrationId' \
        --output text 2>/dev/null || echo "")

    if [ -n "$INTEGRATION_ID" ]; then
        # Create route
        aws apigatewayv2 create-route \
            --api-id "${API_ID}" \
            --route-key "${ROUTE_KEY}" \
            --target "integrations/${INTEGRATION_ID}" > /dev/null 2>&1 || log_warn "Route may already exist"

        # Grant permission to API Gateway
        aws lambda add-permission \
            --function-name "${FUNCTION_NAME}" \
            --statement-id "apigateway-invoke-$(date +%s)" \
            --action lambda:InvokeFunction \
            --principal apigateway.amazonaws.com \
            --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
            2>/dev/null || log_warn "Permission already exists (non-critical)"

        log_info "✓ Route created: ${ROUTE_KEY}"
    fi
}

# Create routes
create_route "${LESSON_GENERATOR_FUNCTION}" "POST /student/lesson/generate"
create_route "${QUIZ_GENERATOR_FUNCTION}" "POST /student/quiz/generate"
create_route "${CHAT_TUTOR_FUNCTION}" "POST /student/chat"
create_route "${QUIZ_EVALUATOR_FUNCTION}" "POST /student/quiz/submit"
create_route "${GET_QUIZ_RESULTS_FUNCTION}" "GET /teacher/quiz/results"

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id "${API_ID}" --query 'ApiEndpoint' --output text)

###############################################################################
# Step 9: Save Deployment Info
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 9: Saving Deployment Information"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Update deployment-info.json with student features
python3 << EOF
import json

with open('deployment-info.json', 'r') as f:
    info = json.load(f)

# Add student features
info['studentFeatures'] = {
    'lessonGenerator': '${LESSON_GENERATOR_FUNCTION}',
    'quizGenerator': '${QUIZ_GENERATOR_FUNCTION}',
    'chatTutor': '${CHAT_TUTOR_FUNCTION}',
    'quizEvaluator': '${QUIZ_EVALUATOR_FUNCTION}',
    'getQuizResults': '${GET_QUIZ_RESULTS_FUNCTION}',
    'lessonsTable': '${LESSONS_TABLE}',
    'quizzesTable': '${QUIZZES_TABLE}',
    'chatTable': '${CHAT_TABLE}',
    'quizResultsTable': '${QUIZ_RESULTS_TABLE}',
    'apiRoutes': {
        'generateLesson': 'POST /student/lesson/generate',
        'generateQuiz': 'POST /student/quiz/generate',
        'chat': 'POST /student/chat',
        'submitQuiz': 'POST /student/quiz/submit',
        'getQuizResults': 'GET /teacher/quiz/results'
    }
}

with open('deployment-info.json', 'w') as f:
    json.dump(info, f, indent=2)

print("✓ Deployment info updated")
EOF

###############################################################################
# Deployment Complete
###############################################################################

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║      SmartTutor Student Features Deployment Complete!           ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

echo "DEPLOYMENT SUMMARY"
echo "AWS Account ID:        ${AWS_ACCOUNT_ID}"
echo "AWS Region:            ${AWS_REGION}"
echo ""
echo "LAMBDA FUNCTIONS:"
echo "  Lesson Generator:    ${LESSON_GENERATOR_FUNCTION}"
echo "  Quiz Generator:      ${QUIZ_GENERATOR_FUNCTION}"
echo "  Chat Tutor:          ${CHAT_TUTOR_FUNCTION}"
echo "  Quiz Evaluator:      ${QUIZ_EVALUATOR_FUNCTION}"
echo "  Get Quiz Results:    ${GET_QUIZ_RESULTS_FUNCTION}"
echo ""
echo "DYNAMODB TABLES:"
echo "  Lessons:             ${LESSONS_TABLE}"
echo "  Quizzes:             ${QUIZZES_TABLE}"
echo "  Chat Sessions:       ${CHAT_TABLE}"
echo "  Quiz Results:        ${QUIZ_RESULTS_TABLE}"
echo ""
echo "API ENDPOINTS:"
echo "  Base URL:            ${API_ENDPOINT}/prod"
echo "  Generate Lesson:     POST /student/lesson/generate"
echo "  Generate Quiz:       POST /student/quiz/generate"
echo "  Chat Tutor:          POST /student/chat"
echo "  Submit Quiz:         POST /student/quiz/submit"
echo "  Get Quiz Results:    GET  /teacher/quiz/results"
echo ""
echo "NEXT STEPS:"
echo "  1. The frontend is already configured to use these endpoints"
echo "  2. Open index.html in a browser to test student features"
echo "  3. Click on any topic card to generate a personalized lesson"
echo "  4. Monitor CloudWatch Logs for Lambda execution details"
echo ""

log_info "✅ All student features deployed successfully!"
