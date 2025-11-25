#!/bin/bash

###############################################################################
# SmartTutor Backend Deployment Script
# Deploys the complete 3-layer architecture to AWS
###############################################################################

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║         SmartTutor Backend Deployment to AWS                     ║"
echo "║                                                                  ║"
echo "║     Layer 1: User Interaction (Already deployed - Frontend)     ║"
echo "║     Layer 2: GenAI Processing Pipeline (Lambda + Bedrock)       ║"
echo "║     Layer 3: Storage & Analytics (S3, DynamoDB, OpenSearch)      ║"
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

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Please install it first."
    log_info "Install: https://aws.amazon.com/cli/"
    exit 1
fi
log_info "✓ AWS CLI found: $(aws --version)"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials not configured."
    log_info "Run: aws configure"
    exit 1
fi
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_info "✓ AWS Account ID: $AWS_ACCOUNT_ID"
log_info "✓ AWS Region: $AWS_REGION"

# Check jq for JSON processing
if ! command -v jq &> /dev/null; then
    log_warn "jq not found. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq || true
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y jq || true
    fi
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 not found."
    exit 1
fi
log_info "✓ Python found: $(python3 --version)"

###############################################################################
# Step 2: Create S3 Bucket (Layer 3: Storage)
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 2: Creating S3 Bucket (Layer 3 - Storage)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

if aws s3 ls "s3://${S3_BUCKET}" 2>&1 | grep -q 'NoSuchBucket'; then
    log_info "Creating S3 bucket: ${S3_BUCKET}"

    if [ "$AWS_REGION" == "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket "${S3_BUCKET}" \
            --region "${AWS_REGION}"
    else
        aws s3api create-bucket \
            --bucket "${S3_BUCKET}" \
            --region "${AWS_REGION}" \
            --create-bucket-configuration LocationConstraint="${AWS_REGION}"
    fi

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${S3_BUCKET}" \
        --versioning-configuration Status=Enabled

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${S3_BUCKET}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'

    # Create folder structure
    for folder in "lessons/" "quizzes/" "lesson-plans/" "quiz-results/" "chat-logs/"; do
        aws s3api put-object --bucket "${S3_BUCKET}" --key "${folder}"
    done

    log_info "✓ S3 bucket created: s3://${S3_BUCKET}"
else
    log_info "✓ S3 bucket already exists: ${S3_BUCKET}"
fi

###############################################################################
# Step 3: Create DynamoDB Tables (Layer 3: Storage)
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 3: Creating DynamoDB Tables (Layer 3 - Storage)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Create LessonPlans table
LESSON_PLANS_TABLE="${PROJECT_NAME}-LessonPlans"
if ! aws dynamodb describe-table --table-name "${LESSON_PLANS_TABLE}" &> /dev/null; then
    log_info "Creating DynamoDB table: ${LESSON_PLANS_TABLE}"

    aws dynamodb create-table \
        --table-name "${LESSON_PLANS_TABLE}" \
        --attribute-definitions \
            AttributeName=planId,AttributeType=S \
            AttributeName=teacherId,AttributeType=S \
            AttributeName=weekStartDate,AttributeType=S \
        --key-schema AttributeName=planId,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=TeacherClassIndex,KeySchema=[{AttributeName=teacherId,KeyType=HASH},{AttributeName=weekStartDate,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --region "${AWS_REGION}"

    log_info "Waiting for table to become active..."
    aws dynamodb wait table-exists --table-name "${LESSON_PLANS_TABLE}"
    log_info "✓ DynamoDB table created: ${LESSON_PLANS_TABLE}"
else
    log_info "✓ DynamoDB table already exists: ${LESSON_PLANS_TABLE}"
fi

###############################################################################
# Step 4: Create IAM Role for Lambda (Layer 2: Processing)
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 4: Creating IAM Role for Lambda Functions"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check if role exists
if ! aws iam get-role --role-name "${LAMBDA_ROLE_NAME}" &> /dev/null; then
    log_info "Creating IAM role: ${LAMBDA_ROLE_NAME}"

    # Create trust policy
    cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    aws iam create-role \
        --role-name "${LAMBDA_ROLE_NAME}" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --description "Execution role for SmartTutor Lambda functions"

    # Create and attach policy
    cat > /tmp/lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::${S3_BUCKET}",
        "arn:aws:s3:::${S3_BUCKET}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${LESSON_PLANS_TABLE}",
        "arn:aws:dynamodb:${AWS_REGION}:${AWS_ACCOUNT_ID}:table/${LESSON_PLANS_TABLE}/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${AWS_REGION}:${AWS_ACCOUNT_ID}:*"
    }
  ]
}
EOF

    aws iam put-role-policy \
        --role-name "${LAMBDA_ROLE_NAME}" \
        --policy-name "${PROJECT_NAME}-LambdaPolicy" \
        --policy-document file:///tmp/lambda-policy.json

    log_info "✓ IAM role created: ${LAMBDA_ROLE_NAME}"
    log_warn "Waiting 10 seconds for IAM role to propagate..."
    sleep 10
else
    log_info "✓ IAM role already exists: ${LAMBDA_ROLE_NAME}"
fi

LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${LAMBDA_ROLE_NAME}"

###############################################################################
# Step 5: Deploy Lambda Function (Layer 2: Processing)
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 5: Deploying Lambda Function (Layer 2 - GenAI Processing)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

LAMBDA_FUNCTION_NAME="${PROJECT_NAME}-LessonPlanGenerator"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Package Lambda function
log_info "Packaging Lambda function..."
cd "${SCRIPT_DIR}/lambda-functions"
zip -q lesson_plan_generator.zip lesson_plan_generator.py

# Deploy or update Lambda
if ! aws lambda get-function --function-name "${LAMBDA_FUNCTION_NAME}" &> /dev/null; then
    log_info "Creating Lambda function: ${LAMBDA_FUNCTION_NAME}"

    aws lambda create-function \
        --function-name "${LAMBDA_FUNCTION_NAME}" \
        --runtime python3.9 \
        --role "${LAMBDA_ROLE_ARN}" \
        --handler lesson_plan_generator.lambda_handler \
        --zip-file fileb://lesson_plan_generator.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},LESSON_PLANS_TABLE=${LESSON_PLANS_TABLE}}" \
        --description "Generates weekly lesson plans using Amazon Bedrock"

    log_info "✓ Lambda function created: ${LAMBDA_FUNCTION_NAME}"
else
    log_info "Updating existing Lambda function: ${LAMBDA_FUNCTION_NAME}"

    aws lambda update-function-code \
        --function-name "${LAMBDA_FUNCTION_NAME}" \
        --zip-file fileb://lesson_plan_generator.zip

    aws lambda update-function-configuration \
        --function-name "${LAMBDA_FUNCTION_NAME}" \
        --environment "Variables={SMARTTUTOR_BUCKET=${S3_BUCKET},LESSON_PLANS_TABLE=${LESSON_PLANS_TABLE}}"

    log_info "✓ Lambda function updated: ${LAMBDA_FUNCTION_NAME}"
fi

rm lesson_plan_generator.zip
cd - > /dev/null

###############################################################################
# Step 6: Create API Gateway (Layer 1: User Interaction Interface)
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 6: Creating API Gateway (Layer 1 - User Interaction Interface)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

API_NAME="${PROJECT_NAME}-API"

# Check if API exists
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='${API_NAME}'].ApiId" --output text 2>/dev/null || echo "")

if [ -z "$API_ID" ]; then
    log_info "Creating HTTP API: ${API_NAME}"

    API_ID=$(aws apigatewayv2 create-api \
        --name "${API_NAME}" \
        --protocol-type HTTP \
        --cors-configuration "AllowOrigins=*,AllowMethods=GET,POST,PUT,DELETE,OPTIONS,AllowHeaders=Content-Type,Authorization" \
        --query 'ApiId' \
        --output text)

    log_info "✓ API created with ID: ${API_ID}"
else
    log_info "✓ API already exists: ${API_ID}"
fi

# Create integration
log_info "Setting up Lambda integration..."

INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "${API_ID}" \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}" \
    --payload-format-version "2.0" \
    --query 'IntegrationId' \
    --output text 2>/dev/null || echo "")

if [ -n "$INTEGRATION_ID" ]; then
    log_info "✓ Integration created: ${INTEGRATION_ID}"

    # Create route
    aws apigatewayv2 create-route \
        --api-id "${API_ID}" \
        --route-key "POST /teacher/lesson-plan/generate" \
        --target "integrations/${INTEGRATION_ID}" > /dev/null

    log_info "✓ Route created: POST /teacher/lesson-plan/generate"
fi

# Create or get stage
STAGE_NAME="prod"
if ! aws apigatewayv2 get-stage --api-id "${API_ID}" --stage-name "${STAGE_NAME}" &> /dev/null; then
    aws apigatewayv2 create-stage \
        --api-id "${API_ID}" \
        --stage-name "${STAGE_NAME}" \
        --auto-deploy > /dev/null
    log_info "✓ Stage created: ${STAGE_NAME}"
fi

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
    --function-name "${LAMBDA_FUNCTION_NAME}" \
    --statement-id "apigateway-invoke-$(date +%s)" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
    2>/dev/null || log_warn "Lambda permission already exists or failed (non-critical)"

# Get API endpoint
API_ENDPOINT="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${STAGE_NAME}"

###############################################################################
# Step 7: Verify Bedrock Access
###############################################################################

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 7: Verifying Amazon Bedrock Access"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

log_info "Checking Bedrock model access..."
if aws bedrock list-foundation-models --region "${AWS_REGION}" &> /dev/null; then
    log_info "✓ Bedrock access confirmed"
    log_warn "Please ensure you have enabled:"
    log_warn "  - Claude 3 Sonnet (anthropic.claude-3-sonnet-20240229-v1:0)"
    log_warn "  - Llama 3 70B (meta.llama3-70b-instruct-v1:0)"
else
    log_error "Bedrock access failed. Check IAM permissions and model access."
fi

###############################################################################
# Deployment Summary
###############################################################################

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║              SmartTutor Backend Deployment Complete!             ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "DEPLOYMENT SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "AWS Account ID:        ${AWS_ACCOUNT_ID}"
echo "AWS Region:            ${AWS_REGION}"
echo ""
echo "LAYER 3 - Storage:"
echo "  S3 Bucket:           s3://${S3_BUCKET}"
echo "  DynamoDB Table:      ${LESSON_PLANS_TABLE}"
echo ""
echo "LAYER 2 - Processing:"
echo "  Lambda Function:     ${LAMBDA_FUNCTION_NAME}"
echo "  IAM Role:            ${LAMBDA_ROLE_NAME}"
echo ""
echo "LAYER 1 - API Interface:"
echo "  API Gateway ID:      ${API_ID}"
echo "  API Endpoint:        ${API_ENDPOINT}"
echo "  Route:               POST /teacher/lesson-plan/generate"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "NEXT STEPS"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "1. Update frontend configuration:"
echo "   Edit: ui-prototype/js/api-config.js"
echo "   Set API_ENDPOINT = '${API_ENDPOINT}'"
echo ""
echo "2. Test the API:"
echo "   ./backend/test_api.sh"
echo ""
echo "3. Open teacher dashboard:"
echo "   open ui-prototype/pages/teacher-dashboard.html"
echo ""
echo "4. Click '🔄 Regenerate Plan' to test Bedrock integration"
echo ""
echo "═══════════════════════════════════════════════════════════════════"

# Save configuration
cat > "${SCRIPT_DIR}/deployment-info.json" <<EOF
{
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "awsAccountId": "${AWS_ACCOUNT_ID}",
  "region": "${AWS_REGION}",
  "environment": "${ENVIRONMENT}",
  "s3Bucket": "${S3_BUCKET}",
  "dynamodbTable": "${LESSON_PLANS_TABLE}",
  "lambdaFunction": "${LAMBDA_FUNCTION_NAME}",
  "iamRole": "${LAMBDA_ROLE_NAME}",
  "apiGatewayId": "${API_ID}",
  "apiEndpoint": "${API_ENDPOINT}"
}
EOF

log_info "Deployment info saved to: ${SCRIPT_DIR}/deployment-info.json"
echo ""
