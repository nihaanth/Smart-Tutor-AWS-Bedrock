# SmartTutor — AI-Powered Adaptive Learning Platform

> **Production-scale serverless AI education platform** built independently to demonstrate cloud-native AI architecture and full-stack engineering depth.
>
> ## What This Solves
>
> Traditional online learning platforms deliver static content with no personalization — students at different levels receive the same material, leading to disengagement and poor learning outcomes. SmartTutor solves this by using generative AI to dynamically generate personalized lesson plans, adaptive quizzes, and real-time tutoring responses calibrated to each student's performance level.
>
> **This is a production-architecture demonstration of cloud-native AI system design — not an academic exercise.**
>
> ## Performance Metrics
>
> | Metric | Value |
> |--------|-------|
> | API Response Time | < 200ms (sub-200ms target met) |
> | Difficulty Adaptation | Real-time, per-student |
> | Backend Architecture | Fully serverless (zero server management) |
> | AI Model | AWS Bedrock Claude AI |
> | Deployment | AWS Lambda + API Gateway |
>
> ## Tech Stack
>
> **AI / Backend**
> - AWS Bedrock (Claude AI) — generative AI for lesson and quiz content
> - - AWS Lambda — serverless compute for all business logic
>   - - API Gateway — RESTful API layer
>     - - DynamoDB — NoSQL storage for student progress and quiz results
>       - - CloudWatch — monitoring, logging, performance tracking
>        
>         - **Frontend**
>         - - HTML/CSS/JavaScript — lightweight, fast-loading UI prototype
>           - - Adaptive quiz interface with dynamic difficulty rendering
>            
>             - **Infrastructure**
>             - - Fully serverless: no EC2, no containers, zero idle cost
>               - - Shell deployment scripts for repeatable, auditable deployments
>                
>                 - ## Architecture
>                
>                 - ```
>                   Student/Teacher UI
>                           |
>                      API Gateway (REST)
>                           |
>                      Lambda Functions
>                      ├── lesson-generator   → AWS Bedrock (Claude AI)
>                      ├── quiz-generator     → AWS Bedrock (Claude AI)
>                      ├── chat-tutor         → AWS Bedrock (Claude AI)
>                      ├── quiz-evaluator     → Business logic
>                      └── get-quiz-results   → DynamoDB read
>                           |
>                      DynamoDB (student data, progress, results)
>                           |
>                      CloudWatch (monitoring + alerting)
>                   ```
>
> ## Key Features
>
> - **AI-Generated Lesson Plans** — Claude AI creates subject-specific content calibrated to student grade level and performance history
> - - **Adaptive Quiz Engine** — Quiz difficulty adjusts dynamically based on student response accuracy, not just completion
>   - - **Real-Time AI Tutor** — Chat-based tutoring assistant powered by AWS Bedrock with context-aware responses
>     - - **Student Progress Dashboard** — Tracks performance over time with personalized recommendations
>       - - **Teacher Analytics Dashboard** — Instructor view of class-wide and individual student performance
>        
>         - ## Architectural Decisions
>        
>         - **Why serverless?** Lambda eliminates server provisioning overhead and enables automatic scaling with zero infrastructure management — critical for an education platform with unpredictable load patterns.
>        
>         - **Why AWS Bedrock vs OpenAI API?** Bedrock integrates natively with AWS IAM, enabling fine-grained access control and keeping all data within the AWS ecosystem — a requirement for production education platforms handling student data.
>
> **Why DynamoDB?** The flexible schema handles varied student data structures (different subjects, quiz formats, progress states) without migration overhead, and provides sub-10ms reads at scale.
>
> ## Quick Start
>
> ```bash
> # 1. Setup environment
> python3 -m venv venv && source venv/bin/activate
> pip install -r requirements.txt
>
> # 2. Configure AWS credentials
> aws configure
>
> # 3. Deploy backend
> cd backend/ && chmod +x deploy_backend.sh && ./deploy_backend.sh
>
> # 4. Launch UI
> cd ui-prototype/ && python -m http.server 8000
> # Open: http://localhost:8000
> ```
>
> ## Project Structure
>
> ```
> Smart-Tutor-AWS-Bedrock/
> ├── backend/
> │   ├── lambda-functions/     # All Lambda function code
> │   ├── config/               # Backend configuration (region, table names)
> │   └── deploy_backend.sh     # One-command backend deployment
> ├── bedrock-demo/             # Standalone Bedrock integration demos
> ├── ui-prototype/             # Frontend HTML/CSS/JS
> │   ├── pages/                # Student + teacher page components
> │   ├── js/                   # API integration + adaptive quiz logic
> │   └── css/                  # Responsive stylesheets
> └── requirements.txt
> ```
>
> ## Built By
>
> **Nihaanth Reddy Vulupala** — Full-Stack Software & AI Systems Engineer
> - Portfolio: [nihaanth.com](https://nihaanth.com)
> - - LinkedIn: [linkedin.com/in/nihaanth](https://linkedin.com/in/nihaanth)
>   - - GitHub: [github.com/nihaanth](https://github.com/nihaanth)
>    
>     - > This project was built independently alongside professional engineering work at SwipeHome and ThinkBubble, demonstrating initiative and self-directed AI system design capability.
