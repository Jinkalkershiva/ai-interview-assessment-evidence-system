# AI Interview Assessment & Evidence System

An AI-powered assessment and preparation platform built with Spring Boot and React that combines resume-based interviews, document-grounded exam preparation, structured assessments, work analysis, evidence collection, and AI avatar-based interaction.

The system uses a hybrid RAG pipeline combining BM25 keyword retrieval and semantic embeddings to ground AI-generated content in uploaded documents.

- **Repository**: [https://github.com/Jinkalkershiva/ai-interview-assessment-evidence-system](https://github.com/Jinkalkershiva/ai-interview-assessment-evidence-system)
- **Author**: Shiva Jinkalker ([https://github.com/Jinkalkershiva/](https://github.com/Jinkalkershiva/))

---

## Table of Contents

- [Core Features](#core-features)
  - [AI Exam Preparation](#ai-exam-preparation)
  - [AI Interview Assessment](#ai-interview-assessment)
  - [Interactive Coding Assessment](#interactive-coding-assessment)
  - [AI Work Assessment & Evidence](#ai-work-assessment--evidence)
  - [AI Avatar Interaction](#ai-avatar-interaction)
  - [Reviewer Dashboard](#reviewer-dashboard)
  - [Design System & Theme Engine](#design-system--theme-engine)
- [Hybrid RAG Architecture](#hybrid-rag-architecture)
- [RAG Implementation Details](#rag-implementation-details)
- [Diagram Generation](#diagram-generation)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Free-Tier & Cost-Safe Development](#free-tier--cost-safe-development)
- [Token Safety Measures](#token-safety-measures)
- [Getting Started](#getting-started)
- [Verification](#verification)
- [Author](#author)

---

## Core Features

### AI Exam Preparation
- **Multi-Format Document Ingestion**: Upload study materials in `PDF`, `DOC`, `DOCX`, `PPT`, `PPTX`, and `TXT` formats.
- **Page & Slide Aware Extraction**: Retains authentic location metadata (`Page X`, `Slide X`, `Section X`) across extractions via Apache PDFBox and Apache POI.
- **Customizable Exam Patterns**: Interactive configuration for question distributions across three standardized tiers:
  - **Section A (2 Marks)**: Definitions, terminology, factual recall.
  - **Section B (5 Marks)**: Structured comparisons, core mechanisms, algorithmic walkthroughs.
  - **Section C (8 Marks)**: Architectural evaluation, comprehensive workflows, multi-step problem solving.
- **Hybrid RAG Grounding**: Queries are resolved through parallel BM25 keyword and dense semantic vector searches merged via Reciprocal Rank Fusion (RRF).
- **Exact Count Validation & 2nd-Attempt Retrieval**: Guarantees that returned question counts match requested configurations without inventing low-quality placeholder text; uses targeted semantic retrieval to resolve deficits.
- **Source Citation & Grounding**: Every question displays the source document, page/slide number, and verbatim text excerpt.
- **Importance Ratings**: Star ratings (1 to 5) rendered with SVG stars for all questions and study topics.
- **Mermaid-Based Diagrams**: Structured flowcharts generated when visual architecture clarifies a topic; returns `null` for purely theoretical topics.
- **Live RAG Inspection Modal**: In-browser inspection modal displaying total indexed chunks, candidate retrieval pools, individual BM25 scores, semantic cosine scores, and final hybrid RRF ranks.
- **Document-Style PDF Export**: Generates clean, formatted exam papers and study guides using OpenPDF.

### AI Interview Assessment
- **Resume-Grounded Interviews**: Upload candidate resumes (`PDF`/`DOCX`) with configurable job roles, experience levels (Fresher, Intermediate, Senior, Lead), interview types (Technical, Behavioral, Mixed, System Design), and question counts.
- **Target Job Role Catalog**: Searchable catalog of software engineering and cloud roles with multi-role tagging.
- **Interactive Multi-Turn Sessions**: Audio playback, speech-to-text voice recognition, question timers, and live transcription.
- **Comprehensive Evaluation Reports**: Structured scoring across technical proficiency, communication, problem-solving, strengths, areas for improvement, and model answers.

### Interactive Coding Assessment
- **Embedded Monaco Code Editor**: Browser-based IDE with syntax highlighting, indentation, and keyboard shortcuts.
- **Multi-Language Support**: Java, Python, C++, and JavaScript.
- **Sandbox Code Execution**: Dispatches code to a secure compilation backend (Wandbox API) with standard input/output testing against challenge test suites.

### AI Work Assessment & Evidence
- **Real-Time Work Update Rooms**: Standup and sync rooms identified by room IDs and security tokens.
- **Categorized Transcript Logging**: Real-time statement logging categorized under Completed, In Progress, Blockers, and Technical Decisions.
- **Screen Frame Analysis**: Visual verification comparing captured screen frames against participant update claims.
- **AI Follow-Up Inquiries**: Contextual follow-up questions generated during active work sessions.
- **Evidence-Backed PDF Reporting**: Downloadable audit reports documenting delivery timelines, key milestones, and visual evidence.

### AI Avatar Interaction
- **Procedural 2D Canvas Avatar**: In-browser canvas renderer featuring real-time speech synchronization, dynamic mouth phoneme states, and natural eye blinking.
- **Avatar Personalities**: Configurable interviewer profiles with distinct voice characteristics and pacing.

### Reviewer Dashboard
- **Session Management**: Reviewer console for evaluating completed candidate interviews and work update rooms.
- **Score Overrides & Feedback**: Editable evaluation summaries, manual score overrides, and audit trails.

### Design System & Theme Engine
- **Dual Visual Modes**:
  - **Pencil (Light Mode)**: Warm, pencil-toned paper surface with high legibility.
  - **ChatGPT Black (Dark Mode)**: Pure dark surface with high contrast readability and zero glossy glare.
- **Unified Accent Palette**: Consistent interaction accents across both themes with solid surfaces and zero glassmorphism.
- **Background Atmospheres**: Paper, Graphite, Aurora, Focus, and Custom background image presets.

---

## Hybrid RAG Architecture

The exam preparation engine uses a dual-branch **Hybrid RAG architecture** combining sparse keyword retrieval with dense vector semantic retrieval:

```
                         USER
                           │
                           ▼
                  Upload Documents (PDF / DOCX / PPTX / TXT)
                           │
                           ▼
                  Document Extraction (Page / Slide / Section aware)
                           │
                           ▼
                     Smart Chunking (DocumentChunk with location metadata)
                           │
                  ┌────────┴────────┐
                  │                 │
                  ▼                 ▼
             BM25 Engine       Embedding Model
           (k1=1.2, b=0.75)    (BAAI/bge-small-en-v1.5)
           Keyword retrieval    384-d semantic retrieval
                  │                 │
                  └────────┬────────┘
                           ▼
                    Hybrid Ranking (RRF k=60)
                           │
                           ▼
                    Deduplication & Top-k Evidence (k=12)
                           │
                           ▼
                       Gemini LLM (Evidence chunks only, no full doc dump)
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
    Questions         Study Guide          Diagrams
    (2M / 5M / 8M)   (Summary & Points)  (Structured Mermaid / null)
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                    Source Evidence (Doc, Page/Slide, Verbatim Snippet)
                           │
                           ▼
            Strict Validation & 2nd-Attempt Retrieval
                           │
                           ▼
                Exam Paper UI & Inspection Modal
                           │
                           ▼
                      PDF Export (OpenPDF)
```

### Architectural Principles

1. **BM25 Retrieval**: Matches exact domain vocabulary, method names, syntax tokens, and definitions using length-normalized frequency scoring.
2. **BGE-Small Semantic Retrieval**: Captures conceptual relationships, synonyms, and paraphrased passages using 384-dimensional dense vectors.
3. **Reciprocal Rank Fusion (RRF)**: Merges candidates from both retrieval branches without score-scaling mismatches ($k = 60$).
4. **Top-K Evidence Window**: Passes only the top 12 highest-ranked unique chunks to the LLM, preventing token bloat on large documents.
5. **Separation of Concerns**:
   - Embedding model handles semantic vector representation.
   - BM25 handles sparse lexical indexing.
   - LLM handles question generation and study guide synthesis.
6. **Grounding Traceability**: Every question retains its source evidence tuple (`documentName`, `pageOrSection`, `snippet`).

---

## RAG Implementation Details

### Document Processing Pipeline
1. **Extraction**:
   - `PDF`: Apache PDFBox extracts text page-by-page, recording `Page X`.
   - `PPTX`: Apache POI extracts text slide-by-slide, recording `Slide X`.
   - `DOCX`: Apache POI extracts text by paragraphs into bounded sections, recording `Section X`.
   - `TXT`: Cleaned and divided into bounded semantic chunks.
2. **Chunking**: Sub-chunks long passages into target windows (~600 characters) preserving sentence boundaries and source page numbers.

### Retrieval Pipeline
- **Embedding Model**: `BAAI/bge-small-en-v1.5`
  - Dimensions: **384** (dense float vector, L2 unit normalized: $\|v\|_2 = 1.0$).
  - Query prefix: Automatically applies `"Represent this sentence for searching relevant passages: "`.
  - In-memory cache: Thread-safe LRU cache avoiding re-computations.
- **Semantic Vector Index**:
  - In-memory index storing chunk vectors with exact dot-product cosine similarity search.
- **BM25 Parameters**:
  - $k_1 = 1.2$ (term saturation).
  - $b = 0.75$ (document length normalization).
  - Robertson-Spärck Jones IDF.
- **Hybrid Fusion (RRF)**:
  $$\text{RRF\_score}(d) = \frac{1}{60 + \text{rank}_{\text{BM25}}(d)} + \frac{1}{60 + \text{rank}_{\text{Semantic}}(d)}$$
- **Candidate Pool**: 20–24 candidates retrieved per branch; deduplicated into a unified set.
- **Top-K Selection**: Top 12 unique evidence chunks passed to the prompt.

### Generation Pipeline
- The LLM receives structured evidence chunks with clear citation tags (`[Page 1]`, `[Slide 3]`).
- Output format: Raw structured JSON validating the requested pattern (2M, 5M, 8M).
- If candidate generation has a deficit, a targeted second-attempt retrieval executes with category-specific semantic focus queries.

---

## Diagram Generation

Diagram generation follows a structured pipeline:

```
LLM
 │ (analyzes topic for visual architecture/workflow)
 ▼
Structured Mermaid Specification (e.g. flowchart TD\n  A --> B) OR null
 │
 ▼
Frontend MermaidViewer
 │
 ├── Rendered SVG Diagram (via dynamic Mermaid loader)
 └── Code Specification Viewer (interactive toggle)
```

- **Selective Generation**: Purely factual or definition-based topics receive `diagram: null`.
- **Zero Image APIs**: Diagrams are rendered locally in the browser from text specifications, eliminating image-generation API costs.

---

## Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Backend Framework** | Java 21 / Spring Boot 4.1.1 | Modular monolith architecture |
| **AI Abstraction** | Spring AI 2.0.1 | ChatClient via OpenAI-compatible endpoint |
| **LLM Provider** | Google Gemini | Configured as `gemini-3.8-flash` |
| **Embedding Engine** | BAAI/bge-small-en-v1.5 | 384-dimensional dense semantic vectors |
| **Vector Index** | SemanticVectorIndex | In-memory cosine similarity search |
| **Lexical Search** | Bm25Retriever | BM25 with length normalization ($k_1=1.2, b=0.75$) |
| **Hybrid Ranking** | HybridRagService | Reciprocal Rank Fusion ($k=60$) |
| **Document Parsing** | Apache PDFBox 3.0.3 / Apache POI 5.3.0 | PDF, DOCX, PPTX extraction with page/slide metadata |
| **PDF Generation** | OpenPDF 2.0.3 | Document-style PDF exam papers and audit reports |
| **Code Execution** | Wandbox API Sandbox | Remote compilation and execution sandbox |
| **Frontend Framework** | React 18.3.1 / Vite 5.4.8 | Single-page web application |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) | In-browser coding workspace |
| **Diagram Engine** | Mermaid.js | Client-side SVG flowchart rendering |
| **Styling** | Vanilla CSS (CSS Variables) | Pencil and ChatGPT Black design system |
| **State Persistence** | Browser `localStorage` / Session | Client-side preferences and session storage |

---

## Project Structure

```
AI_Exam_Helper2/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/examhelper/
│   │   │   │   ├── ai/               # Spring AI analysis service implementations
│   │   │   │   ├── analysis/         # Exam analysis controllers & DTOs
│   │   │   │   ├── common/           # Unified API responses & exception handling
│   │   │   │   ├── export/           # OpenPDF document export services
│   │   │   │   ├── extraction/       # PDFBox & POI document extractors & chunking
│   │   │   │   ├── interview/        # Resume interview, avatar, & coding services
│   │   │   │   ├── rag/              # Hybrid RAG: BM25, BGE-small, Vector Index, RRF
│   │   │   │   │   ├── bm25/         # Bm25Retriever & search models
│   │   │   │   │   ├── embedding/    # BgeSmallEmbeddingService & contracts
│   │   │   │   │   ├── index/        # In-memory SemanticVectorIndex
│   │   │   │   │   └── service/      # HybridRagService coordinator
│   │   │   │   └── workupdate/       # Work update rooms, frame analysis, & reports
│   │   │   └── resources/
│   │   │       ├── application.yml   # Spring Boot & Spring AI configuration
│   │   │       └── ...
│   │   └── test/                     # Unit and integration test suites
│   ├── pom.xml                       # Maven build configuration
│   └── .env.example                  # Backend environment template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── avatar/               # 2D Canvas avatar renderer & stage
│   │   │   ├── interview/            # Interview controls, role & difficulty selectors
│   │   │   ├── Icons.jsx             # Professional SVG icons (zero emojis)
│   │   │   ├── MermaidViewer.jsx     # Structured Mermaid diagram renderer
│   │   │   ├── QuestionCard.jsx      # Collapsible grounded question cards
│   │   │   └── RetrievalEvaluationModal.jsx # Live RAG scoring inspection modal
│   │   ├── pages/
│   │   │   ├── CodingSession.jsx     # Monaco code editor & execution workspace
│   │   │   ├── InterviewSession.jsx  # Multi-turn interview session
│   │   │   ├── ResultsPage.jsx       # Sectioned exam results (2M / 5M / 8M / Study Guide)
│   │   │   ├── UploadPage.jsx        # Document upload & pattern configurator
│   │   │   └── workupdate/           # Work update creation, session, & dashboard
│   │   ├── services/                 # Frontend API client & browser storage
│   │   ├── styles/                   # Design system tokens & global styles
│   │   ├── App.jsx                   # Application shell & multi-mode router
│   │   └── main.jsx                  # React application entry point
│   ├── package.json                  # NPM dependencies & scripts
│   └── vite.config.js                # Vite build configuration
│
├── .env.example                      # Root environment configuration template
├── .gitignore                        # Git exclusion rules
├── README.md                         # Project documentation
└── setup_and_run.bat                 # One-click Windows startup script
```

---

## Environment Configuration

Never commit API keys or secret credentials to version control. The repository includes `.env.example` templates for local configuration.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (optional; runs in mock mode when unset) | *(empty)* |
| `SANDBOX_URL` | Remote code execution endpoint | `https://wandbox.org/api/compile.json` |

To set the key:

**Windows Command Prompt**:
```cmd
set GEMINI_API_KEY=your_gemini_api_key_here
```

**Windows PowerShell**:
```powershell
$env:GEMINI_API_KEY="your_gemini_api_key_here"
```

**Linux / macOS**:
```bash
export GEMINI_API_KEY="your_gemini_api_key_here"
```

Or copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

---

## Free-Tier & Cost-Safe Development

The project is structured to support local development and demonstration without requiring paid API services or consuming unnecessary quota:

- **Zero Startup Calls**: Application startup makes no LLM or external API requests.
- **Zero Ingestion Calls**: Document upload, extraction, and chunking execute 100% locally.
- **Local Retrieval**: BM25 lexical retrieval and BGE-small semantic embeddings run in-process without network calls.
- **Local Diagrams**: Mermaid diagrams are rendered client-side using browser JavaScript; no image-generation APIs are called.
- **Local PDF Export**: OpenPDF compiles documents on the server without third-party services.
- **Built-in Mock Fallback**: When `GEMINI_API_KEY` is not provided or set to `your_gemini_api_key_here`, the application automatically activates high-quality, grounded mock generation for all modules.
- **No Test Calls**: Unit and integration test suites run against local mocks and in-memory indexes, making zero live external API calls during testing.

> *Note on Gemini Quotas*: Gemini API usage depends on the selected model and the provider's current free-tier quota. The application is intended for development and demonstration using a free-tier-compatible API configuration.

---

## Token Safety Measures

To prevent token exhaustion and excessive request costs, the application enforces the following architectural safeguards:

1. **Top-K Chunk Filtering**: Large documents (e.g. 50+ pages) are never forwarded in their entirety to the LLM. Only the top-ranked $K = 12$ evidence chunks are sent.
2. **Deduplicated Context**: Reciprocal Rank Fusion eliminates redundant chunks across retrieval branches.
3. **Structured JSON Output**: Prompts enforce concise, schema-conformant JSON payloads without conversational preamble.
4. **Targeted Second Attempts**: If a question-tier deficit occurs, only the specific missing count is queried using narrow semantic focus chunks.
5. **No External Grounding Overhead**: Does not invoke third-party web search grounding, map queries, or auxiliary multi-agent debate calls.

---

## Getting Started

### Prerequisites
- **Java 21** (Adoptium Temurin recommended)
- **Node.js** (v18+) & **npm**
- **Maven** (3.8+) or use the project build scripts

### 1. Clone the Repository
```bash
git clone https://github.com/Jinkalkershiva/ai-interview-assessment-evidence-system.git
cd ai-interview-assessment-evidence-system
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY if testing live AI generation
```

### 3. One-Click Setup (Windows)
```cmd
setup_and_run.bat
```
This script checks Java 21 and Node.js, builds the frontend, packages the Spring Boot backend, and launches both services.

### 4. Manual Startup

**Start Backend**:
```bash
cd backend
mvn clean package -DskipTests
java -jar target/exam-helper-backend-1.0.0.jar
```
Backend runs on `http://localhost:8080`.

**Start Frontend**:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## Verification

The codebase has undergone local verification without making live LLM calls:

- **Backend Build & Compilation**:
  - `mvn clean test-compile -DskipTests`: **BUILD SUCCESS** (66 source files compiled).
- **Backend Test Suite**:
  - `mvn test`: **BUILD SUCCESS**
  - **31 test cases executed across all modules**:
    - `HybridRagServiceTest`: Verifies BGE-small 384-d vector embeddings, L2 unit normalization, BM25 retrieval, and Reciprocal Rank Fusion.
    - `InterviewServiceTest`: Verifies interview lifecycle, state transitions, and evaluation mocks.
    - `CodeExecutionServiceTest`: Verifies language configurations and compilation request dispatching.
    - `WorkUpdateServiceTest`: Verifies room creation, timeline logging, and report compilation.
  - **0 failures, 0 errors, 0 skipped**.
- **Frontend Production Build**:
  - `npm run build`: **Vite production build passed** (85 modules transformed, zero syntax errors).
- **Secret Audit**:
  - Audited source and configuration files for sensitive patterns (`GEMINI_API_KEY=`, `AIza*`, `client-secret`, `password=`, `secret=`).
  - **Zero hardcoded credentials or secret keys present**.
- **API Cost Safety**:
  - All test runs and build processes executed locally with zero live Gemini API consumption.

---

## Author

**Shiva Jinkalker**
- GitHub: [https://github.com/Jinkalkershiva](https://github.com/Jinkalkershiva)
