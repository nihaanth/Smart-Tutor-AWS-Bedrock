#!/bin/bash

# Deploy Updated Lesson Plan Generator to AWS Lambda
# This script updates the lesson plan generator Lambda function with multi-subject support

set -e  # Exit on error

# Configuration
FUNCTION_NAME="SmartTutor-LessonPlanGenerator"
REGION="us-east-1"
LAMBDA_DIR="lambda-functions"

echo "🚀 SmartTutor Lesson Plan Generator Deployment"
echo "================================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if user is authenticated
echo "📋 Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ Authenticated as AWS Account: $ACCOUNT_ID"
echo ""

# Navigate to lambda functions directory
cd "$LAMBDA_DIR" || exit 1

# Create deployment package
echo "📦 Creating deployment package..."
zip -q -r /tmp/lesson_plan_generator.zip lesson_plan_generator.py
echo "✅ Package created: /tmp/lesson_plan_generator.zip"
echo ""

# Check if function exists
echo "🔍 Checking if Lambda function exists..."
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &> /dev/null; then
    echo "✅ Function found: $FUNCTION_NAME"
    echo ""

    # Update function code
    echo "⬆️  Updating Lambda function code..."
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb:///tmp/lesson_plan_generator.zip \
        --region "$REGION" \
        --output json > /tmp/lambda_update_result.json

    if [ $? -eq 0 ]; then
        echo "✅ Lambda function updated successfully!"
        echo ""

        # Display function details
        FUNCTION_VERSION=$(jq -r '.Version' /tmp/lambda_update_result.json)
        LAST_MODIFIED=$(jq -r '.LastModified' /tmp/lambda_update_result.json)
        CODE_SIZE=$(jq -r '.CodeSize' /tmp/lambda_update_result.json)

        echo "📊 Deployment Details:"
        echo "   Version: $FUNCTION_VERSION"
        echo "   Last Modified: $LAST_MODIFIED"
        echo "   Code Size: $CODE_SIZE bytes"
        echo ""
    else
        echo "❌ Failed to update Lambda function"
        exit 1
    fi
else
    echo "❌ Lambda function '$FUNCTION_NAME' not found in region $REGION"
    echo ""
    echo "Available functions:"
    aws lambda list-functions --region "$REGION" --query 'Functions[].FunctionName' --output table
    echo ""
    echo "Please check:"
    echo "1. Function name is correct"
    echo "2. Function exists in region $REGION"
    echo "3. You have permissions to access it"
    exit 1
fi

# Clean up
rm /tmp/lesson_plan_generator.zip
rm /tmp/lambda_update_result.json

echo "🎉 Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Open teacher dashboard in browser"
echo "2. Click 'Regenerate Plan' button"
echo "3. Check browser console for multi-subject data"
echo "4. Verify CloudWatch logs show multiple subjects"
echo ""
echo "📊 View CloudWatch Logs:"
echo "   aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
echo ""
echo "🔗 Lambda Function Console:"
echo "   https://console.aws.amazon.com/lambda/home?region=$REGION#/functions/$FUNCTION_NAME"
echo ""
