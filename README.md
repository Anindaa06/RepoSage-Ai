# RepoSage

RepoSage is an AI-powered GitHub repository analysis and interview preparation tool.  
Paste any GitHub repository URL and get:

- A deep technical explainer formatted for interviews
- A repository-aware AI chatbot for detailed Q&A
- A mock technical interview flow with scoring feedback and voice support

## Screenshot

![RepoSage UI placeholder](https://via.placeholder.com/1400x800.png?text=RepoSage+Screenshot)

## Features

- Repository ingestion pipeline with metadata, structure, README, languages, and key files
- Smart key-file selection (README, manifests, entry points, root files, largest source files)
- Streaming AI responses via Server-Sent Events for:
- Technical explainer
- Repo chatbot
- Mock interview
- Live markdown rendering with syntax highlighting
- Copy-to-clipboard for code blocks and full markdown export
- Suggested starter prompts in chatbot
- Interview status tracking, timer, scoring parser, and animated feedback bars
- Voice input (speech-to-text) and optional voice output (text-to-speech)
- Mobile-responsive layout with collapsible sidebar

## Project Structure

```text
reposage/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles/
├── server/
│   ├── middleware/
│   ├── routes/
│   └── services/
├── .env.example
└── package.json
```

## Tech Stack

- Frontend: React 18, Vite, React Router v6, Tailwind CSS, Framer Motion, React Markdown, react-syntax-highlighter, Lucide React
- Voice: Web Speech API (SpeechRecognition + SpeechSynthesis)
- Backend: Node.js, Express, Axios, Anthropic SDK, dotenv, cors, helmet, express-rate-limit
- APIs: GitHub REST API + Claude Sonnet (`claude-sonnet-4-20250514`)

## Setup

1. Clone the repository and open the project:
   ```bash
   git clone <your-repo-url>
   cd reposage
   ```
2. Install all dependencies:
   ```bash
   npm run install:all
   ```
3. Create env file for server:
   ```bash
   cp .env.example .env
   ```
4. Update `.env`:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   GITHUB_TOKEN=your_token_optional
   PORT=3001
   ```
5. Start both client and server:
   ```bash
   npm run dev
   ```
6. Open the client in your browser (Vite URL, typically `http://localhost:5173`).

## How To Use

1. Home:
- Paste a GitHub URL (`https://github.com/owner/repo` or `owner/repo`)
- Click **Analyze**
- Review repo metadata card and jump into any feature

2. Explainer:
- Click **Generate Analysis**
- Watch the markdown stream in real time
- Use section navigation and copy/export actions

3. Chat:
- Ask custom repo questions
- Or click suggested prompts for instant starter queries
- Continue conversation with full context retained

4. Mock Interview:
- Start interview session
- Answer by typing or using microphone input
- Enable read-aloud for interviewer questions
- Review final scorecard and detailed feedback

## API Endpoints

- `POST /api/repo/analyze`
- `POST /api/explain` (SSE stream)
- `POST /api/chat` (SSE stream)
- `POST /api/interview` (SSE stream)

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Make focused changes with clear commits
4. Open a pull request with context, screenshots, and testing notes
