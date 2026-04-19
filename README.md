# 📄 PaperChat — Research Paper Q&A (RAG)

![Python](https://img.shields.io/badge/Python-3.10-blue)
![Flask](https://img.shields.io/badge/Flask-Web%20Framework-black)
![LLM](https://img.shields.io/badge/LLM-Groq-green)
![Status](https://img.shields.io/badge/Status-Active-success)

A local **RAG chatbot** that lets you upload up to **3 research PDFs** and ask questions across them.  
Answers are generated using **Groq LLM** and include **citations** showing which paper the information came from.

---

## ✨ Features

- 📄 Upload multiple research papers (PDF)
- 🔍 Ask questions across documents
- 📚 Context-aware answers with citations
- ⚡ Fast responses using Groq LLM
- 🎯 Clean and simple UI

---

## 🚀 Tech Stack

- **Backend:** Python, Flask  
- **LLM:** Groq API (llama-3.3-70b-versatile)  
- **PDF Parsing:** PyPDF2  
- **Retrieval:** TF cosine similarity (in-memory)  
- **Frontend:** HTML, CSS, JavaScript  

---

## 📸 Screenshots



_Add your screenshots here (recommended):_



---

## 📁 Project Structure
research-Q-A-RAG/
│
├── app.py # Flask backend (upload, retrieval, chat)
├── requirements.txt
├── .env # Groq API key (DO NOT commit)
├── .gitignore
├── README.md
│
├── templates/
│ └── index.html # UI
│
└── static/
├── css/style.css
└── js/app.js



---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/jishnuuverse/research-Q-A-RAG.git
cd research-Q-A-RAG
```

### 2. Create a virtual environment

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set your Groq API key

Create a `.env` file in the project root:
GROQ_API_KEY=your-groq-api-key-here
Get your key at https://console.groq.com

### 5. Run the app

```bash
python app.py
```

Open http://localhost:5000 in your browser.

---

## How It Works

1. **Upload** — PDF text is extracted with PyPDF2 and split into ~150-word
   overlapping chunks stored in memory.
2. **Retrieve** — When you ask a question, a TF-based cosine similarity search
   finds the 6 most relevant chunks across all uploaded papers.
3. **Generate** — The top chunks + conversation history are sent to Groq's LLM
   as context. It answers strictly from the provided excerpts and cites the
   source paper.

---

## Environment Variables

| Variable     | Required | Description       |
|--------------|----------|-------------------|
| GROQ_API_KEY | Yes      | Your Groq API key |

---

## Limitations

- Paper text is stored **in memory** — data resets on server restart.
- TF-based retrieval works well for keyword-heavy academic text but may miss
  semantic similarity (e.g., synonyms). Swap for embeddings for production use.
- Scanned PDFs (image-only) cannot have text extracted — use OCR first
  (e.g., Adobe Acrobat, `ocrmypdf`).

---

## Future Improvements

- Semantic embeddings with ChromaDB or FAISS
- Persistent storage (SQLite / PostgreSQL)
- Multi-user support
- OCR support for scanned PDFs

