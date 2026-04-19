import os
import math
import re
import io
from flask import Flask, request, jsonify, render_template, session
from werkzeug.utils import secure_filename
from groq import Groq
import PyPDF2
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20MB max

client = Groq()

# In-memory store: { session_id -> [{ name, chunks }] }
paper_store = {}

CHUNK_SIZE = 150  # words per chunk
CHUNK_OVERLAP = 20  # word overlap between chunks
MAX_PAPERS = 3
TOP_K = 6  # chunks to retrieve per query


# ── helpers ──────────────────────────────────────────────────────────────────


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def make_chunks(text: str, source: str) -> list[dict]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i : i + CHUNK_SIZE]
        chunk_text = " ".join(chunk_words)
        if len(chunk_text.strip()) > 40:
            chunks.append({"text": chunk_text, "source": source})
        i += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def simple_embed(text: str) -> dict:
    """TF-style word-frequency vector."""
    words = re.sub(r"[^a-z0-9 ]", " ", text.lower()).split()
    vec = {}
    for w in words:
        vec[w] = vec.get(w, 0) + 1
    return vec


def cosine_sim(a: dict, b: dict) -> float:
    dot = sum(a.get(k, 0) * v for k, v in b.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def retrieve(query: str, papers: list) -> list[dict]:
    q_vec = simple_embed(query)
    all_chunks = [c for p in papers for c in p["chunks"]]
    scored = [(cosine_sim(q_vec, simple_embed(c["text"])), c) for c in all_chunks]
    scored.sort(key=lambda x: x[0], reverse=True)
    selected = [c for _, c in scored[:TOP_K]]
    
    # Always include the very first chunk of every paper (Title, Authors, Abstract)
    for p in papers[::-1]:
        if p["chunks"] and p["chunks"][0] not in selected:
            selected.insert(0, p["chunks"][0])
            
    return selected


# ── routes ───────────────────────────────────────────────────────────────────


@app.route("/")
def index():
    if "sid" not in session:
        session["sid"] = os.urandom(8).hex()
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    sid = session.get("sid", "anon")
    papers = paper_store.get(sid, [])

    if len(papers) >= MAX_PAPERS:
        return (
            jsonify({"error": f"Maximum {MAX_PAPERS} PDFs allowed. Remove one first."}),
            400,
        )

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    f = request.files["file"]
    if not f.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    name = secure_filename(f.filename)
    short = os.path.splitext(name)[0][:40]

    if any(p["name"] == name for p in papers):
        return jsonify({"error": f'"{short}" is already uploaded'}), 400

    file_bytes = f.read()
    try:
        text = extract_text_from_pdf(file_bytes)
    except Exception as e:
        return jsonify({"error": f"Could not read PDF: {str(e)}"}), 422

    if len(text.strip()) < 100:
        return (
            jsonify(
                {"error": "PDF appears to have no extractable text (scanned image?)"}
            ),
            422,
        )

    chunks = make_chunks(text, short)
    papers.append(
        {"name": name, "short": short, "chunks": chunks, "pages": len(text) // 2000 + 1}
    )
    paper_store[sid] = papers

    return jsonify(
        {
            "message": f'"{short}" uploaded successfully',
            "paper": {"name": name, "short": short, "chunks": len(chunks)},
            "total_papers": len(papers),
        }
    )


@app.route("/papers", methods=["GET"])
def list_papers():
    sid = session.get("sid", "anon")
    papers = paper_store.get(sid, [])
    return jsonify(
        [
            {"name": p["name"], "short": p["short"], "chunks": len(p["chunks"])}
            for p in papers
        ]
    )


@app.route("/remove/<name>", methods=["DELETE"])
def remove_paper(name):
    sid = session.get("sid", "anon")
    papers = paper_store.get(sid, [])
    paper_store[sid] = [p for p in papers if p["name"] != name]
    return jsonify({"message": "Removed"})


@app.route("/chat", methods=["POST"])
def chat():
    sid = session.get("sid", "anon")
    papers = paper_store.get(sid, [])

    if not papers:
        return jsonify({"error": "Upload at least one PDF first"}), 400

    data = request.get_json()
    query = (data.get("query") or "").strip()
    history = data.get("history", [])  # [{role, content}]

    if not query:
        return jsonify({"error": "Query cannot be empty"}), 400

    # ── Casual message detection ──────────────────────────────────────────────
    CASUAL_TRIGGERS = {"hi", "hello", "hey", "thanks", "thank you", "bye", "ok", "okay", "cool", "great"}

    if query.lower().strip("!.,?") in CASUAL_TRIGGERS:
        return jsonify({
            "reply": "Hi! I'm your research assistant. Ask me anything about your uploaded papers!",
            "sources": []
        })

    # Retrieval
    chunks = retrieve(query, papers)
    sources = list(dict.fromkeys(c["source"] for c in chunks))  # unique, ordered
    context = "\n\n---\n\n".join(
        f'[{i+1}] Source: "{c["source"]}"\n{c["text"]}' for i, c in enumerate(chunks)
    )

    system_prompt = (
        "You are a research paper Q&A assistant. "
        "Answer ONLY using the provided context excerpts. "
        "Always cite which paper your answer comes from using the format [Source: paper name]. "
        "Be precise and academic in tone. "
        "If the context doesn't contain enough information, say so clearly. "
        "Do not fabricate information."
    )

    # Build messages: keep last 6 turns of history + new user message with context
    trimmed_history = history[-6:]
    if trimmed_history and trimmed_history[0].get("role") == "assistant":
        trimmed_history = trimmed_history[1:]

    user_content = f"Context from papers:\n\n{context}\n\n---\nQuestion: {query}"
    messages = (
        [{"role": "system", "content": system_prompt}]
        + trimmed_history
        + [{"role": "user", "content": user_content}]
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            messages=messages,
        )
        reply = response.choices[0].message.content
        return jsonify({"reply": reply, "sources": sources})
    except Exception as e:
        return jsonify({"error": f"API Error: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
