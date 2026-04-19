PaperChat — Research Paper Q&A (RAG)

A local RAG chatbot that allows you to upload up to 3 research PDFs and ask questions across them.
Answers are generated using Groq LLM and include citations showing which paper the information came from.

Tech Stack

Backend: Python, Flask 
LLM: Groq API (llama-3.3-70b-versatile)
PDF Parsing: PyPDF2
Retrieval: TF cosine similarity (in-memory)
Frontend: HTML, CSS, JavaScript

Project Structure

research-Q-A-RAG/
│
├── app.py (Flask backend — upload, retrieval, chat routes)
├── requirements.txt
├── .env (Your Groq API key — do NOT commit)
├── .gitignore
├── README.md
│
├── templates/
│ └── index.html (UI)
│
└── static/
├── css/style.css
└── js/app.js

Setup
Clone the repository

git clone https://github.com/jishnuuverse/research-Q-A-RAG.git

cd research-Q-A-RAG

Create virtual environment

python -m venv venv

Activate:
Windows: venv\Scripts\activate
Mac/Linux: source venv/bin/activate

Install dependencies

pip install -r requirements.txt

Add Groq API Key

Create a .env file:

GROQ_API_KEY=your-groq-api-key

Get key: https://console.groq.com

Run the app

python app.py

Open: http://localhost:5000

How It Works

Upload: Extracts text from PDFs and splits into chunks (~150 words).

Retrieve: Uses TF cosine similarity to find the most relevant chunks.

Generate: Sends top chunks + history to Groq LLM to generate answers with citations.

Environment Variables

GROQ_API_KEY (required) — Your Groq API key

Limitations
Data is stored in memory (resets on restart)
TF retrieval may miss semantic meaning
Scanned PDFs are not supported (use OCR tools like ocrmypdf)
Future Improvements
Add embeddings (FAISS / ChromaDB)
Persistent database (SQLite / PostgreSQL)
Multi-user support
OCR support for scanned PDFs
