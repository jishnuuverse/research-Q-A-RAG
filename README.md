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

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/jishnuuverse/research-Q-A-RAG.git
cd research-Q-A-RAG

### 2. Create virtual environment
python -m venv venv

Activate:

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
