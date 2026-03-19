"""
Jules Prompt Studio — Streamlit Application (v2)
· Context Block generated/synthesized by LLM (with chunking on large inputs)
· Prompt Builder + File Manager unified in one Build tab
· Input limit = LLM max tokens (65 536) — chunking auto-applied
· No token counter on Context input — only character/capacity indicator
"""

import streamlit as st
import requests
import json
import re
import math
from datetime import datetime

# ─────────────────────────────────────────────
# Page Config
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Jules Prompt Studio",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
MAX_TOKENS          = 65_536
CHARS_PER_TOKEN     = 4
MAX_INPUT_CHARS     = MAX_TOKENS * CHARS_PER_TOKEN   # 262 144

JULES_API_URL       = "https://jules.googleapis.com/v1alpha/sessions"
LLM_API_URL         = "https://api-ai.tegarfirman.site/v1/generate"
LLM_API_KEY         = ""
DEFAULT_MODEL       = "gemini-flash-latest"

SUPPORTED_EXTENSIONS = [
    ".txt", ".md", ".html", ".htm", ".js", ".ts", ".jsx", ".tsx",
    ".css", ".scss", ".sass", ".less", ".json", ".xml", ".yaml",
    ".yml", ".toml", ".ini", ".cfg", ".env", ".sh", ".bash",
    ".py", ".java", ".c", ".cpp", ".go", ".rs", ".rb", ".php",
    ".sql", ".graphql", ".vue", ".svelte", ".csv", ".log",
]

AUTOMATION_MODES = [None, "AUTO_CREATE_PR"]   # None = omit field (optional)

MODELS = [
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-flash-2.0",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]

CONTEXT_SYSTEM_PROMPT = (
    "You are a senior technical writer and project analyst. "
    "Given raw notes, descriptions, or documentation below, synthesize a clean, "
    "structured project context block. Include: project name/goal, tech stack, "
    "key constraints, relevant versions or environment details, and any critical "
    "background information. Be concise but complete. "
    "Return ONLY the formatted context block — no preamble, no explanation."
)

FILE_ICONS = {
    ".py":"🐍",".js":"📜",".ts":"📘",".jsx":"⚛️",".tsx":"⚛️",
    ".html":"🌐",".htm":"🌐",".css":"🎨",".scss":"🎨",".sass":"🎨",
    ".json":"📋",".yaml":"📋",".yml":"📋",".xml":"📋",
    ".md":"📝",".txt":"📄",".sql":"🗄️",".sh":"⚙️",".bash":"⚙️",
    ".go":"🐹",".rs":"🦀",".rb":"💎",".php":"🐘",
    ".java":"☕",".c":"⚙️",".cpp":"⚙️",".vue":"💚",
    ".toml":"🔧",".ini":"🔧",".cfg":"🔧",".env":"🔑",
    ".csv":"📊",".log":"📋",".graphql":"◈",
}

TEMPLATES = {
    "🏗️ Feature":  (
        "Implement {feature_name} with the following requirements:\n\n"
        "1. {requirement_1}\n2. {requirement_2}\n3. {requirement_3}\n\n"
        "Follow existing code patterns and ensure proper error handling, testing, and documentation."
    ),
    "🐛 Bug Fix":  (
        "Fix the bug described below:\n\nBug Description: {description}\n"
        "Steps to Reproduce: {steps}\nExpected: {expected}\nActual: {actual}\n\n"
        "Provide a minimal, targeted fix with explanation."
    ),
    "♻️ Refactor": (
        "Refactor {file_path} to:\n\n"
        "- Improve readability\n- Eliminate duplication\n- Apply {pattern} pattern\n"
        "- Maintain all existing tests\n\nDo not change external behavior."
    ),
    "📚 Docs":     (
        "Generate comprehensive documentation for {target}:\n\n"
        "- API reference with parameters and return types\n"
        "- Usage examples\n- Edge cases\n- Integration guide"
    ),
    "🧪 Tests":    (
        "Write comprehensive tests for {module}:\n\n"
        "- Unit tests for all public functions\n- Integration tests\n"
        "- Edge case coverage\n- Mock external dependencies\n- >90% coverage"
    ),
}

# ─────────────────────────────────────────────
# CSS
# ─────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap');

:root {
    --bg:       #09090c;
    --bg-card:  #0f1117;
    --bg-el:    #161923;
    --bg-in:    #0c0e14;
    --green:    #00e87a;
    --blue:     #3b8ef3;
    --amber:    #f5a623;
    --red:      #f04155;
    --purple:   #9d7dea;
    --teal:     #2dd4bf;
    --fg:       #dde1ec;
    --muted:    #5a6478;
    --dim:      #2e3748;
    --border:   #1c2130;
    --border2:  #252d3d;
    --mono:     'JetBrains Mono', monospace;
    --display:  'Syne', sans-serif;
    --r:        7px;
}

.stApp { background: var(--bg) !important; font-family: var(--mono) !important; }
html, body, [class*="css"] { background-color: var(--bg) !important; color: var(--fg) !important; font-family: var(--mono) !important; }

section[data-testid="stSidebar"] { background: var(--bg-card) !important; border-right: 1px solid var(--border) !important; }
section[data-testid="stSidebar"] * { font-family: var(--mono) !important; }

.hdr { font-family: var(--display); font-weight: 800; font-size: 1.85rem; letter-spacing: -0.04em;
       background: linear-gradient(120deg, var(--green) 0%, var(--blue) 55%, var(--purple) 100%);
       -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
       line-height: 1.1; display: inline-block; }
.sub { font-size: 0.67rem; color: var(--muted); letter-spacing: 0.18em; text-transform: uppercase; margin-top: 0.2rem; }

.lbl { font-family: var(--display); font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
       letter-spacing: 0.13em; color: var(--green); margin-bottom: 0.45rem;
       display: flex; align-items: center; gap: 0.4rem; }
.lbl-blue   { color: var(--blue); }
.lbl-amber  { color: var(--amber); }
.lbl-purple { color: var(--purple); }
.lbl-teal   { color: var(--teal); }

.hr  { border: none; border-top: 1px solid var(--border);  margin: 0.9rem 0; }
.hr2 { border: none; border-top: 1px solid var(--border2); margin: 0.5rem 0; }

/* ── LLM Context Gen card ── */
.gen-card {
    background: linear-gradient(135deg, rgba(0,232,122,.04) 0%, rgba(59,142,243,.04) 100%);
    border: 1px solid rgba(0,232,122,.18); border-radius: var(--r);
    padding: 0.95rem 1.05rem; margin-bottom: 0.7rem;
}
.gen-badge {
    display: inline-flex; align-items: center; gap: .3rem;
    background: rgba(0,232,122,.1); border: 1px solid rgba(0,232,122,.25);
    border-radius: 20px; padding: .12rem .6rem;
    font-size: .6rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--green); margin-bottom: .6rem;
}

/* ── Capacity bar ── */
.cap-wrap { margin: .25rem 0 .55rem; }
.cap-row  { display: flex; justify-content: space-between;
            font-size: .62rem; color: var(--muted); letter-spacing: .07em;
            text-transform: uppercase; margin-bottom: .2rem; }
.cap-bg   { background: var(--bg); border-radius: 3px; height: 3px; overflow: hidden; }
.cap-fill { height: 3px; border-radius: 3px; transition: width .25s; }

/* ── Chunk pills ── */
.cpills { display: flex; flex-wrap: wrap; gap: .25rem; margin: .3rem 0; }
.cpill  { background: rgba(59,142,243,.1); border: 1px solid rgba(59,142,243,.25);
          border-radius: 4px; padding: .15rem .5rem; font-size: .6rem;
          color: var(--blue); font-weight: 600; }

/* ── Pills ── */
.pill { display: inline-block; padding: .11rem .52rem; border-radius: 20px;
        font-size: .59rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.pg  { background: rgba(0,232,122,.1);  color: var(--green);  border: 1px solid rgba(0,232,122,.25); }
.pb  { background: rgba(59,142,243,.1); color: var(--blue);   border: 1px solid rgba(59,142,243,.25); }
.pa  { background: rgba(245,166,35,.1); color: var(--amber);  border: 1px solid rgba(245,166,35,.25); }
.pr  { background: rgba(240,65,85,.1);  color: var(--red);    border: 1px solid rgba(240,65,85,.25); }
.pp  { background: rgba(157,125,234,.1);color: var(--purple); border: 1px solid rgba(157,125,234,.25); }
.pt  { background: rgba(45,212,191,.1); color: var(--teal);   border: 1px solid rgba(45,212,191,.25); }

/* ── Token bar ── */
.tok-wrap { background: var(--bg-el); border: 1px solid var(--border); border-radius: 6px; padding: .55rem .8rem; margin: .35rem 0; }
.tok-lbl  { font-size: .62rem; color: var(--muted); text-transform: uppercase; letter-spacing: .09em; margin-bottom: .3rem; }

/* ── File rows ── */
.frow { background: var(--bg-el); border: 1px solid var(--border); border-radius: 6px;
        padding: .5rem .75rem; margin: .22rem 0;
        display: flex; align-items: center; justify-content: space-between; font-size: .71rem;
        transition: border-color .14s; }
.frow:hover { border-color: var(--border2); }
.fn  { color: var(--fg); font-weight: 500; }
.fm  { color: var(--muted); font-size: .6rem; margin-top: .08rem; }

/* ── Session / code blocks ── */
.sess-card { background: var(--bg-el); border: 1px solid var(--border); border-left: 3px solid var(--green);
             border-radius: 6px; padding: .7rem .85rem; margin: .35rem 0; font-size: .73rem; }
.code-pre  { background: var(--bg-in); border: 1px solid var(--border); border-radius: 6px;
             padding: .8rem; font-family: var(--mono); font-size: .69rem; color: var(--green);
             white-space: pre-wrap; word-break: break-word; max-height: 250px; overflow-y: auto; line-height: 1.6; }

/* ── Streamlit widget overrides ── */
.stTabs [data-baseweb="tab-list"] { background: var(--bg-card) !important; border-bottom: 1px solid var(--border) !important; }
.stTabs [data-baseweb="tab"]      { color: var(--muted) !important; font-family: var(--mono) !important; font-size: .69rem !important; font-weight: 600 !important; letter-spacing: .1em !important; text-transform: uppercase !important; padding: .6rem 1rem !important; }
.stTabs [aria-selected="true"]    { color: var(--green) !important; border-bottom: 2px solid var(--green) !important; background: rgba(0,232,122,.04) !important; }

.stTextArea textarea  { background: var(--bg-in) !important; border: 1px solid var(--border) !important; border-radius: 6px !important; color: var(--fg) !important; font-family: var(--mono) !important; font-size: .74rem !important; line-height: 1.6 !important; }
.stTextArea textarea:focus { border-color: var(--green) !important; box-shadow: 0 0 0 1px rgba(0,232,122,.17) !important; }
.stTextInput input    { background: var(--bg-in) !important; border: 1px solid var(--border) !important; border-radius: 6px !important; color: var(--fg) !important; font-family: var(--mono) !important; font-size: .74rem !important; }
.stTextInput input:focus { border-color: var(--green) !important; box-shadow: 0 0 0 1px rgba(0,232,122,.17) !important; }
.stSelectbox > div > div { background: var(--bg-in) !important; border: 1px solid var(--border) !important; border-radius: 6px !important; color: var(--fg) !important; }

.stButton > button { background: var(--bg-el) !important; border: 1px solid var(--border2) !important; border-radius: 6px !important; color: var(--fg) !important; font-family: var(--mono) !important; font-size: .68rem !important; font-weight: 600 !important; letter-spacing: .06em !important; text-transform: uppercase !important; transition: all .13s !important; padding: .38rem .85rem !important; }
.stButton > button:hover { border-color: var(--green) !important; color: var(--green) !important; background: rgba(0,232,122,.05) !important; }
.stButton > button[kind="primary"] { background: rgba(0,232,122,.1) !important; border-color: var(--green) !important; color: var(--green) !important; }

div[data-testid="stExpander"]  { background: var(--bg-card) !important; border: 1px solid var(--border) !important; border-radius: 7px !important; }
div[data-testid="stMetric"]    { background: var(--bg-card) !important; border: 1px solid var(--border) !important; border-radius: 7px !important; padding: .6rem !important; }
div[data-testid="stMetric"] label { font-family: var(--mono) !important; font-size: .6rem !important; color: var(--muted) !important; text-transform: uppercase !important; letter-spacing: .1em !important; }
div[data-testid="stMetric"] [data-testid="stMetricValue"] { font-family: var(--display) !important; font-size: 1.3rem !important; font-weight: 800 !important; color: var(--green) !important; }

.stCheckbox label span, .stRadio label span { font-family: var(--mono) !important; font-size: .71rem !important; }
.stAlert { background: var(--bg-el) !important; border-radius: 6px !important; font-family: var(--mono) !important; font-size: .71rem !important; }
.stSlider > div { background: transparent !important; }

/* sub-nav toggle buttons */
[data-testid="stHorizontalBlock"] > div > div > div > button.sub-active { background: rgba(0,232,122,.1) !important; border-color: var(--green) !important; color: var(--green) !important; }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
</style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────
# Session State
# ─────────────────────────────────────────────
_D = {
    "uploaded_files":      {},
    "context_text":        "",
    "ctx_gen_notes":       "",          # fallback manual notes
    "ctx_gen_info":        [],          # chunk results from last context gen
    "ctx_selected_files":  [],          # filenames selected for context generation
    "ctx_input_mode":      "files",     # "files" | "manual"
    "prompt_text":         "",
    "synthesized_prompt":  "",
    "jules_sessions":      [],
    "jules_api_key":       "",
    "llm_api_key":         LLM_API_KEY,
    "llm_model":           DEFAULT_MODEL,
    "llm_temperature":     1.0,
    "llm_top_p":           0.95,
    "llm_system":          "",
    "jules_source":        "",
    "jules_branch":        "main",
    "jules_automation":    None,               # optional — None or AUTO_CREATE_PR
    "jules_title":         "",
    "chunk_strategy":      "sliding_window",
    "chunk_size":          8000,
    "chunk_overlap":       800,
    "assembled_prompt":    "",
    "synthesis_history":   [],
    "build_sub":           "prompt",          # "prompt" | "jules"
    "_confirm_clear":      False,
}
for _k, _v in _D.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def est(text: str) -> int:
    return max(1, len(text) // CHARS_PER_TOKEN)

def fmt_size(n: int) -> str:
    return f"{n}B" if n<1024 else f"{n/1024:.1f}KB" if n<1024**2 else f"{n/1024**2:.1f}MB"

def file_icon(ext: str) -> str:
    return FILE_ICONS.get(ext.lower(), "📄")

def cap_bar(chars: int, label_r: str = "") -> str:
    pct = min(chars / MAX_INPUT_CHARS * 100, 100)
    c = "var(--green)" if pct < 70 else "var(--amber)" if pct < 95 else "var(--red)"
    return (
        f'<div class="cap-wrap">'
        f'<div class="cap-row"><span>Capacity</span><span>{label_r}</span></div>'
        f'<div class="cap-bg"><div class="cap-fill" style="width:{pct:.1f}%;background:{c};"></div></div>'
        f'</div>'
    )

def tok_bar(tokens: int) -> str:
    ratio  = min(tokens / MAX_TOKENS, 1.0)
    pct    = ratio * 100
    filled = int(ratio * 28)
    empty  = 28 - filled
    c  = "#00e87a" if ratio < 0.7 else "#f5a623" if ratio < 0.95 else "#f04155"
    bar = f'<span style="color:{c}">{"█"*filled}</span><span style="color:var(--dim)">{"░"*empty}</span>'
    return (
        f'<div class="tok-wrap">'
        f'<div class="tok-lbl">Token Budget</div>'
        f'<div style="font-size:.8rem;">{bar} '
        f'<span style="color:{c};font-weight:700;">{tokens:,}</span>'
        f'<span style="color:var(--muted);font-size:.66rem;"> / {MAX_TOKENS:,} ({pct:.1f}%)</span>'
        f'</div></div>'
    )

def mini_breakdown(ctx: int, pmt: int, fil: int, total: int) -> str:
    rows = [("Context", ctx, "var(--blue)"),
            ("Prompt",  pmt, "var(--green)"),
            ("Files",   fil, "var(--purple)")]
    html = ""
    for label, t, color in rows:
        pct = t / max(total, 1) * 100
        html += (
            f'<div style="margin:.28rem 0;">'
            f'<div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:.14rem;">'
            f'<span style="color:{color}">{label}</span>'
            f'<span style="color:var(--muted)">{t:,} ({pct:.1f}%)</span></div>'
            f'<div style="background:var(--bg);border-radius:2px;height:2px;">'
            f'<div style="width:{pct:.1f}%;height:2px;background:{color};border-radius:2px;"></div>'
            f'</div></div>'
        )
    return html

def chunk_pills(chunks: list) -> str:
    pills = "".join(
        f'<span class="cpill">#{i+1} · {est(c):,}tok</span>'
        for i, c in enumerate(chunks)
    )
    return f'<div class="cpills">{pills}</div>'


# ─────────────────────────────────────────────
# Chunking
# ─────────────────────────────────────────────

def sw_chunks(text: str, chunk_tok: int, overlap_tok: int) -> list[str]:
    cc, oc = chunk_tok * CHARS_PER_TOKEN, overlap_tok * CHARS_PER_TOKEN
    if len(text) <= cc:
        return [text]
    out, start = [], 0
    while start < len(text):
        end, chunk = start + cc, text[start:start+cc]
        if end < len(text):
            nl = chunk.rfind('\n')
            if nl > cc * 0.5:
                end = start + nl + 1
                chunk = text[start:end]
        out.append(chunk)
        if end >= len(text):
            break
        start = max(0, end - oc)
    return out

def sem_chunks(text: str, max_tok: int) -> list[str]:
    parts = re.split(r'(\n#{1,6}\s|\n---\n|\n\n\n)', text)
    out, cur, ctok = [], [], 0
    for p in parts:
        pt = est(p)
        if ctok + pt > max_tok and cur:
            out.append("".join(cur))
            last = cur[-1] if cur else ""
            cur, ctok = [last, p], est(last) + pt
        else:
            cur.append(p); ctok += pt
    if cur:
        out.append("".join(cur))
    final = []
    mc = max_tok * CHARS_PER_TOKEN
    for ch in out:
        final.extend(sw_chunks(ch, max_tok, max_tok//10) if len(ch) > mc else [ch])
    return [c for c in final if c.strip()]

def do_chunk(text: str, strategy: str, size: int, overlap: int) -> list[str]:
    if strategy == "sliding_window":
        return sw_chunks(text, size, overlap)
    if strategy == "semantic":
        return sem_chunks(text, size)
    sem = sem_chunks(text, size)
    out = []
    for ch in sem:
        out.extend(sw_chunks(ch, size, overlap) if est(ch) > size else [ch])
    return out


# ─────────────────────────────────────────────
# Prompt Assembly
# ─────────────────────────────────────────────

def assemble(context: str, prompt: str, files: dict, enabled_only=True) -> str:
    parts = []
    if context.strip():
        parts.append(f"[CONTEXT]\n{context.strip()}")
    if prompt.strip():
        parts.append(f"[PROMPT]\n{prompt.strip()}")
    app = []
    for fname, fd in files.items():
        if enabled_only and not fd.get("enabled", True):
            continue
        ext = fd.get("ext", "").lstrip(".")
        app.append(f"[FILE: {fname}]\n```{ext}\n{fd['content']}\n```")
    if app:
        parts.append("[APPENDICES]\n\n" + "\n\n".join(app))
    return "\n\n---\n\n".join(parts)


# ─────────────────────────────────────────────
# LLM API
# ─────────────────────────────────────────────

def call_llm(prompt: str, system: str = "") -> tuple[bool, str]:
    payload = {
        "prompt":             prompt,
        "model_name":         st.session_state.llm_model,
        "temperature":        float(st.session_state.llm_temperature),
        "top_p":              float(st.session_state.llm_top_p),
        "system_instruction": system or st.session_state.llm_system,
        "user_metadata":      "",
    }
    headers = {
        "accept":       "application/json",
        "x-api-key":    st.session_state.llm_api_key,
        "Content-Type": "application/json",
    }
    try:
        r = requests.post(LLM_API_URL, json=payload, headers=headers, timeout=90)
        r.raise_for_status()
        d = r.json()
        text = (d.get("output_text") or d.get("response") or d.get("text")
                or d.get("content") or d.get("output") or d.get("result") or str(d))
        # Also capture metadata for display
        _meta = {
            "model":  d.get("model", ""),
            "usage":  d.get("usage") or {},
            "finish": d.get("finish_reason", ""),
        }
        st.session_state["_last_llm_meta"] = _meta
        return True, text
    except requests.exceptions.RequestException as e:
        return False, f"Network error: {e}"
    except Exception as e:
        return False, f"Error: {e}"


def synth_chunked(text: str, system: str) -> tuple[list[dict], str]:
    """Auto-chunk if needed, call LLM per chunk, return (results, combined)."""
    strategy = st.session_state.chunk_strategy
    size     = int(st.session_state.chunk_size)
    overlap  = int(st.session_state.chunk_overlap)
    tokens   = est(text)
    results  = []

    if tokens <= MAX_TOKENS:
        ok, resp = call_llm(text, system)
        results.append({"idx":1,"total":1,"tokens":tokens,"ok":ok,"response":resp})
        return results, resp if ok else ""

    chunks    = do_chunk(text, strategy, size, overlap)
    responses = []
    for i, ch in enumerate(chunks):
        ok, resp = call_llm(ch, system)
        results.append({"idx":i+1,"total":len(chunks),"tokens":est(ch),"ok":ok,"response":resp})
        if ok:
            responses.append(resp)

    combined = (
        responses[0] if len(responses) == 1
        else "\n\n---\n\n".join(
            f"[CHUNK {i+1}/{len(responses)}]\n{r}" for i, r in enumerate(responses)
        ) if responses else ""
    )
    return results, combined


# ─────────────────────────────────────────────
# Jules API
# ─────────────────────────────────────────────

def create_session(prompt: str) -> tuple[bool, dict]:
    payload: dict = {
        "prompt":         prompt,
        "automationMode": st.session_state.jules_automation,
    }
    if st.session_state.jules_title.strip():
        payload["title"] = st.session_state.jules_title.strip()
    if st.session_state.jules_source.strip():
        payload["sourceContext"] = {
            "source": st.session_state.jules_source.strip(),
            "githubRepoContext": {
                "startingBranch": st.session_state.jules_branch.strip() or "main"
            },
        }
    headers = {
        "Content-Type":   "application/json",
        "X-Goog-Api-Key": st.session_state.jules_api_key,
    }
    try:
        r = requests.post(JULES_API_URL, json=payload, headers=headers, timeout=30)
        r.raise_for_status()
        return True, r.json()
    except requests.exceptions.HTTPError as e:
        try:    body = r.json()
        except: body = {"raw": r.text}
        return False, {"error": str(e), "details": body}
    except requests.exceptions.RequestException as e:
        return False, {"error": str(e)}


# ═══════════════════════════════════════════════════
#  SIDEBAR
# ═══════════════════════════════════════════════════
with st.sidebar:
    st.markdown(
        '<div class="hdr">Jules<br/>Studio</div>'
        '<div class="sub">Prompt Engineering Platform</div>',
        unsafe_allow_html=True,
    )
    st.markdown('<hr class="hr">', unsafe_allow_html=True)

    st.markdown('<div class="lbl">🔑 API Keys</div>', unsafe_allow_html=True)
    st.session_state.jules_api_key = st.text_input(
        "Jules API Key", value=st.session_state.jules_api_key,
        type="password", placeholder="AIza…")
    st.session_state.llm_api_key = st.text_input(
        "LLM Synthesis Key", value=st.session_state.llm_api_key,
        type="password", placeholder="sk-…")

    st.markdown('<hr class="hr">', unsafe_allow_html=True)
    st.markdown('<div class="lbl">🤖 LLM Settings</div>', unsafe_allow_html=True)
    st.session_state.llm_model = st.selectbox(
        "Model", MODELS,
        index=MODELS.index(st.session_state.llm_model)
              if st.session_state.llm_model in MODELS else 0)
    st.session_state.llm_temperature = st.slider("Temperature", 0.0, 2.0,
        float(st.session_state.llm_temperature), 0.05)
    st.session_state.llm_top_p = st.slider("Top-P", 0.0, 1.0,
        float(st.session_state.llm_top_p), 0.01)
    st.session_state.llm_system = st.text_area(
        "Global System Instruction", value=st.session_state.llm_system,
        height=70, placeholder="Optional global system instruction…")

    st.markdown('<hr class="hr">', unsafe_allow_html=True)
    st.markdown('<div class="lbl">🔀 Chunking</div>', unsafe_allow_html=True)
    st.session_state.chunk_strategy = st.radio(
        "Strategy",
        ["sliding_window", "semantic", "hybrid"],
        format_func=lambda x: {"sliding_window":"Sliding Window",
                                "semantic":"Semantic","hybrid":"Hybrid"}[x],
        index=["sliding_window","semantic","hybrid"].index(st.session_state.chunk_strategy))
    _ca, _cb = st.columns(2)
    with _ca:
        st.session_state.chunk_size = st.number_input(
            "Chunk (tok)", 1000, 60000, int(st.session_state.chunk_size), 500)
    with _cb:
        st.session_state.chunk_overlap = st.number_input(
            "Overlap (tok)", 0, 5000, int(st.session_state.chunk_overlap), 100)

    st.markdown('<hr class="hr">', unsafe_allow_html=True)
    st.markdown('<div class="lbl">🚀 Jules Config</div>', unsafe_allow_html=True)
    st.session_state.jules_title = st.text_input(
        "Session Title", value=st.session_state.jules_title, placeholder="My Feature")
    st.session_state.jules_source = st.text_input(
        "Repo Source", value=st.session_state.jules_source,
        placeholder="sources/github/owner/repo")
    # (branch field is now shown conditionally after automation mode — see below)
    _auto_labels = {None: "— none (optional) —", "AUTO_CREATE_PR": "AUTO_CREATE_PR"}
    _auto_idx = 0 if st.session_state.jules_automation not in AUTOMATION_MODES else AUTOMATION_MODES.index(st.session_state.jules_automation)
    st.session_state.jules_automation = st.selectbox(
        "Automation Mode",
        AUTOMATION_MODES,
        index=_auto_idx,
        format_func=lambda x: _auto_labels.get(x, str(x)),
    )
    # Branch only relevant when a repo source is configured
    if st.session_state.jules_source.strip():
        st.session_state.jules_branch = st.text_input(
            "Branch", value=st.session_state.jules_branch, placeholder="main")
    else:
        st.session_state.jules_branch = ""
        st.caption("Branch: set Repo Source above to configure")

    st.markdown('<hr class="hr">', unsafe_allow_html=True)
    _assembled_sb = assemble(
        st.session_state.context_text,
        st.session_state.prompt_text,
        st.session_state.uploaded_files,
    )
    _tot_sb   = est(_assembled_sb)
    _n_files  = len(st.session_state.uploaded_files)
    _n_active = sum(1 for f in st.session_state.uploaded_files.values() if f.get("enabled",True))
    _sa, _sb = st.columns(2)
    _sa.metric("Files",    f"{_n_active}/{_n_files}")
    _sb.metric("Sessions", len(st.session_state.jules_sessions))
    st.markdown(tok_bar(_tot_sb), unsafe_allow_html=True)


# ═══════════════════════════════════════════════════
#  MAIN HEADER
# ═══════════════════════════════════════════════════
st.markdown(
    '<div class="hdr">Jules Prompt Studio</div>'
    '<div class="sub">Google Jules API · LLM Synthesis · Intelligent Context Generation</div>',
    unsafe_allow_html=True,
)
st.markdown('<hr class="hr">', unsafe_allow_html=True)

# ═══════════════════════════════════════════════════
#  TABS  (4 top-level)
# ═══════════════════════════════════════════════════
tab_build, tab_synth, tab_export = st.tabs([
    "🏗️  Build",
    "🤖  LLM Synthesis",
    "📊  Preview & Export",
])


# ═══════════════════════════════════════════════════
#  TAB 1 — BUILD  (Prompt Builder + File Manager)
# ═══════════════════════════════════════════════════
with tab_build:

    # ── Sub-nav ──────────────────────────────────────────────
    _nav1, _nav2, _navsp = st.columns([1.5, 1.5, 5])
    with _nav1:
        _to_prompt = st.button(
            "✍️  Build Prompt",
            use_container_width=True,
            type="primary" if st.session_state.build_sub == "prompt" else "secondary",
        )
    with _nav2:
        _to_jules = st.button(
            "🚀  Send to Jules",
            use_container_width=True,
            type="primary" if st.session_state.build_sub == "jules" else "secondary",
        )
    if _to_prompt and st.session_state.build_sub != "prompt":
        st.session_state.build_sub = "prompt"; st.rerun()
    if _to_jules and st.session_state.build_sub != "jules":
        st.session_state.build_sub = "jules"; st.rerun()

    st.markdown('<hr class="hr2">', unsafe_allow_html=True)

    # ════════════════════════════════════════
    #  PANE A — PROMPT BUILDER
    # ════════════════════════════════════════
    if st.session_state.build_sub == "prompt":
        _L, _R = st.columns([11, 7], gap="large")

        # ──────────────────────────────────
        # LEFT — Context + Prompt
        # ──────────────────────────────────
        with _L:

            # ╔══════════════════════════════════════╗
            # ║  CONTEXT BLOCK — File-Driven LLM Gen ║
            # ╚══════════════════════════════════════╝
            st.markdown(
                '<div class="lbl">📌 Context Block'
                '<span class="pill pt" style="margin-left:.4rem;">LLM Powered</span>'
                '</div>',
                unsafe_allow_html=True,
            )

            # ── Mode toggle: Files vs Manual ────────────────
            _mode_a, _mode_b, _mode_sp = st.columns([1.6, 1.4, 5])
            with _mode_a:
                _to_files_mode = st.button(
                    "📂 From Files",
                    use_container_width=True,
                    type="primary" if st.session_state.ctx_input_mode == "files" else "secondary",
                    key="ctx_mode_files",
                )
            with _mode_b:
                _to_manual_mode = st.button(
                    "✏️ Manual",
                    use_container_width=True,
                    type="primary" if st.session_state.ctx_input_mode == "manual" else "secondary",
                    key="ctx_mode_manual",
                )
            if _to_files_mode:
                st.session_state.ctx_input_mode = "files"
                st.rerun()
            if _to_manual_mode:
                st.session_state.ctx_input_mode = "manual"
                st.rerun()

            st.markdown('<hr class="hr2">', unsafe_allow_html=True)

            # ════════════════════════════════
            # MODE A — FROM FILES
            # ════════════════════════════════
            if st.session_state.ctx_input_mode == "files":
                st.markdown('<div class="gen-card">', unsafe_allow_html=True)
                st.markdown('<div class="gen-badge">✦ Synthesize Context from Uploaded Files</div>', unsafe_allow_html=True)
                st.caption(
                    "Select which uploaded files the LLM should read to generate the context block. "
                    "File contents are concatenated, auto-chunked if they exceed the token limit, "
                    "then synthesized into a structured project context."
                )

                _all_files = st.session_state.uploaded_files
                if not _all_files:
                    st.markdown(
                        '<div style="color:var(--muted);font-size:.72rem;padding:.6rem 0 .3rem;">'
                        '⚠ No files uploaded yet — switch to the <b>Files</b> pane to add files first.'
                        '</div>',
                        unsafe_allow_html=True,
                    )
                    _do_gen = False
                else:
                    # ── File selection grid ─────────────────
                    st.markdown(
                        '<div style="font-size:.65rem;color:var(--muted);'
                        'text-transform:uppercase;letter-spacing:.08em;margin-bottom:.35rem;">'
                        'Select files to include in context generation</div>',
                        unsafe_allow_html=True,
                    )

                    # Quick-select row
                    _qs1, _qs2, _qs3 = st.columns([1, 1, 4])
                    if _qs1.button("☑ All", use_container_width=True, key="ctx_sel_all"):
                        st.session_state.ctx_selected_files = list(_all_files.keys())
                        st.rerun()
                    if _qs2.button("☐ None", use_container_width=True, key="ctx_sel_none"):
                        st.session_state.ctx_selected_files = []
                        st.rerun()

                    # Prune removed files from selection
                    st.session_state.ctx_selected_files = [
                        f for f in st.session_state.ctx_selected_files if f in _all_files
                    ]

                    # Per-file checkboxes — 2-column layout
                    _fnames = list(_all_files.keys())
                    _col_a, _col_b = st.columns(2)
                    for _fi, _fname in enumerate(_fnames):
                        _fd      = _all_files[_fname]
                        _icon    = file_icon(_fd["ext"])
                        _ftok    = est(_fd["content"])
                        _short   = _fname if len(_fname) <= 22 else "…" + _fname[-21:]
                        _checked = _fname in st.session_state.ctx_selected_files
                        _col     = _col_a if _fi % 2 == 0 else _col_b
                        with _col:
                            _nv = st.checkbox(
                                f"{_icon} {_short}",
                                value=_checked,
                                key=f"ctx_sel_{_fname}",
                                help=f"{_fname} — {_ftok:,} tokens  |  {fmt_size(_fd['size'])}",
                            )
                            if _nv and _fname not in st.session_state.ctx_selected_files:
                                st.session_state.ctx_selected_files.append(_fname)
                                st.rerun()
                            elif not _nv and _fname in st.session_state.ctx_selected_files:
                                st.session_state.ctx_selected_files.remove(_fname)
                                st.rerun()

                    # ── Selected-files stats ────────────────
                    _sel_names   = st.session_state.ctx_selected_files
                    _sel_content = "\n\n".join(
                        f"### FILE: {n} ###\n{_all_files[n]['content']}"
                        for n in _sel_names if n in _all_files
                    )
                    _sel_chars   = len(_sel_content)
                    _sel_tok     = est(_sel_content)
                    _n_sel       = len(_sel_names)

                    if _n_sel > 0:
                        # Aggregate capacity bar
                        st.markdown(
                            cap_bar(_sel_chars,
                                    f"{_n_sel} file{'s' if _n_sel>1 else ''} · "
                                    f"{_sel_chars:,} chars"),
                            unsafe_allow_html=True,
                        )

                        # Chunk preview when content exceeds limit
                        if _sel_tok > MAX_TOKENS:
                            _prev_cks = do_chunk(
                                _sel_content,
                                st.session_state.chunk_strategy,
                                int(st.session_state.chunk_size),
                                int(st.session_state.chunk_overlap),
                            )
                            st.markdown(
                                f'<div style="font-size:.62rem;color:var(--amber);'
                                f'margin:.12rem 0 .06rem;">⚠ Exceeds limit — will process in '
                                f'{len(_prev_cks)} chunks '
                                f'({st.session_state.chunk_strategy.replace("_"," ").title()})'
                                f'</div>' + chunk_pills(_prev_cks),
                                unsafe_allow_html=True,
                            )
                        else:
                            st.markdown(
                                f'<div style="font-size:.62rem;color:var(--green);margin:.12rem 0;">'
                                f'✓ {_sel_tok:,} tokens — single LLM pass</div>',
                                unsafe_allow_html=True,
                            )
                    else:
                        st.markdown(
                            '<div style="font-size:.65rem;color:var(--muted);margin:.2rem 0;">'
                            'Select at least one file above.</div>',
                            unsafe_allow_html=True,
                        )

                # ── Custom system instruction ───────────────
                with st.expander("⚙️ Customize generation instruction", expanded=False):
                    _ctx_sys = st.text_area(
                        "System instruction for context generation",
                        value=CONTEXT_SYSTEM_PROMPT,
                        height=85,
                        key="_ctx_sys_ta",
                        label_visibility="collapsed",
                    )

                # ── Action row ──────────────────────────────
                _gb1, _gb2 = st.columns([3, 2])
                with _gb1:
                    _do_gen = st.button(
                        "✦ Generate Context from Files",
                        use_container_width=True,
                        type="primary",
                        disabled=(not _all_files or not st.session_state.ctx_selected_files),
                        key="ctx_gen_btn",
                    )
                with _gb2:
                    if st.session_state.ctx_gen_info:
                        _ok_n  = sum(1 for r in st.session_state.ctx_gen_info if r["ok"])
                        _tot_n = len(st.session_state.ctx_gen_info)
                        _sc    = "pg" if _ok_n == _tot_n else "pa"
                        st.markdown(
                            f'<span class="pill {_sc}" style="margin-top:.52rem;'
                            f'display:inline-block;">Last: {_ok_n}/{_tot_n} ok</span>',
                            unsafe_allow_html=True,
                        )

                st.markdown('</div>', unsafe_allow_html=True)  # end gen-card

                # ── Run generation ──────────────────────────
                if _do_gen:
                    _sys_instr = st.session_state.get("_ctx_sys_ta", CONTEXT_SYSTEM_PROMPT)
                    with st.spinner(
                        f"Reading {len(st.session_state.ctx_selected_files)} file(s) "
                        f"and generating context…"
                    ):
                        _res, _combined = synth_chunked(_sel_content, _sys_instr)
                    st.session_state.ctx_gen_info = _res
                    if _combined:
                        st.session_state.context_text = _combined
                        _nck = len(_res)
                        st.session_state["_ctx_gen_success_msg"] = (
                            f"✅ Context generated from "
                            f"{len(st.session_state.ctx_selected_files)} file(s) "
                            f"in {_nck} chunk{'s' if _nck>1 else ''} — review below."
                        )
                        st.rerun()
                    else:
                        for _r in _res:
                            if not _r["ok"]:
                                st.error(f"Chunk {_r['idx']}: {_r['response']}")

            # ════════════════════════════════
            # MODE B — MANUAL INPUT
            # ════════════════════════════════
            else:
                st.markdown('<div class="gen-card">', unsafe_allow_html=True)
                st.markdown('<div class="gen-badge">✏️ Manual Context Input</div>', unsafe_allow_html=True)
                st.caption(
                    "Type or paste context directly. This can be project metadata, stack info, "
                    "constraints, or any background the LLM should know. "
                    "Optionally send it through the LLM for cleanup."
                )

                _notes = st.text_area(
                    "Manual context notes",
                    value=st.session_state.ctx_gen_notes,
                    height=130,
                    placeholder=(
                        "Project: E-commerce checkout rebuild\n"
                        "Stack: Next.js 14, Stripe, PostgreSQL 15, Redis\n"
                        "Constraints: Must be PCI-DSS compliant. No third-party auth libraries.\n"
                        "Goal: Replace legacy PHP/MySQL system with cloud-native architecture.\n"
                        "Version: v2.0.0  Branch: feature/checkout-v2"
                    ),
                    label_visibility="collapsed",
                    key="_ctx_notes_ta",
                )
                if _notes != st.session_state.ctx_gen_notes:
                    st.session_state.ctx_gen_notes = _notes

                _nc = len(_notes)
                st.markdown(
                    cap_bar(_nc, f"{_nc:,} / {MAX_INPUT_CHARS:,} chars"),
                    unsafe_allow_html=True,
                )

                if _nc > 0 and est(_notes) > MAX_TOKENS:
                    _prev_cks = do_chunk(
                        _notes,
                        st.session_state.chunk_strategy,
                        int(st.session_state.chunk_size),
                        int(st.session_state.chunk_overlap),
                    )
                    st.markdown(
                        f'<div style="font-size:.62rem;color:var(--amber);margin:.12rem 0 .06rem;">'
                        f'⚠ Exceeds limit — {len(_prev_cks)} chunks</div>'
                        + chunk_pills(_prev_cks),
                        unsafe_allow_html=True,
                    )

                with st.expander("⚙️ Customize generation instruction", expanded=False):
                    _ctx_sys = st.text_area(
                        "System instruction",
                        value=CONTEXT_SYSTEM_PROMPT,
                        height=85,
                        key="_ctx_sys_ta",
                        label_visibility="collapsed",
                    )

                _mb1, _mb2, _mb3 = st.columns([2, 2, 2])
                with _mb1:
                    _do_gen = st.button(
                        "✦ Synthesize via LLM",
                        use_container_width=True,
                        type="primary",
                        disabled=not _notes.strip(),
                        key="ctx_gen_btn",
                    )
                with _mb2:
                    _do_use_raw = st.button(
                        "📋 Use as-is",
                        use_container_width=True,
                        disabled=not _notes.strip(),
                        key="ctx_use_raw",
                    )
                with _mb3:
                    if st.session_state.ctx_gen_info:
                        _ok_n  = sum(1 for r in st.session_state.ctx_gen_info if r["ok"])
                        _tot_n = len(st.session_state.ctx_gen_info)
                        _sc    = "pg" if _ok_n == _tot_n else "pa"
                        st.markdown(
                            f'<span class="pill {_sc}" style="margin-top:.52rem;'
                            f'display:inline-block;">Last: {_ok_n}/{_tot_n} ok</span>',
                            unsafe_allow_html=True,
                        )

                st.markdown('</div>', unsafe_allow_html=True)  # end gen-card

                # ── Run generation ──────────────────────────
                if _do_gen:
                    _sys_instr = st.session_state.get("_ctx_sys_ta", CONTEXT_SYSTEM_PROMPT)
                    with st.spinner("Synthesizing context via LLM…"):
                        _res, _combined = synth_chunked(_notes, _sys_instr)
                    st.session_state.ctx_gen_info = _res
                    if _combined:
                        st.session_state.context_text = _combined
                        st.session_state["_ctx_gen_success_msg"] = (
                            f"✅ Context generated ({len(_res)} chunk(s)) — review below."
                        )
                        st.rerun()
                    else:
                        for _r in _res:
                            if not _r["ok"]:
                                st.error(f"Chunk {_r['idx']}: {_r['response']}")

                if _do_use_raw:
                    st.session_state.context_text = _notes
                    st.rerun()

            # ── Context output — always visible ─────────────
            # Show deferred success message from post-generation rerun
            if st.session_state.get("_ctx_gen_success_msg"):
                st.success(st.session_state.pop("_ctx_gen_success_msg"))

            st.markdown(
                '<div class="lbl" style="margin-top:.65rem;">📌 Context — Review & Edit</div>',
                unsafe_allow_html=True,
            )

            # Status line showing source
            if st.session_state.context_text:
                _ctx_src_n = len(st.session_state.ctx_selected_files)
                _src_label = (
                    f"Generated from {_ctx_src_n} file(s)"
                    if st.session_state.ctx_input_mode == "files" and st.session_state.ctx_gen_info
                    else "Manually entered"
                    if st.session_state.ctx_input_mode == "manual"
                    else "Ready"
                )
                _ctx_chars = len(st.session_state.context_text)
                st.markdown(
                    f'<div style="font-size:.62rem;color:var(--muted);margin-bottom:.3rem;">'
                    f'<span class="pill pg">{_src_label}</span> &nbsp; '
                    f'{_ctx_chars:,} chars</div>',
                    unsafe_allow_html=True,
                )

            _ctx_new = st.text_area(
                "context_edit_ta",
                value=st.session_state.context_text,
                height=150,
                placeholder=(
                    "Context will appear here after generation.\n"
                    "You can also edit it freely at any time.\n\n"
                    "Project: …\nStack: …\nConstraints: …\nGoal: …"
                ),
                label_visibility="collapsed",
                key="_ctx_edit_ta",
            )
            if _ctx_new != st.session_state.context_text:
                st.session_state.context_text = _ctx_new

            _cca, _ccb = st.columns(2)
            with _cca:
                if st.button("🗑️ Clear Context", use_container_width=True, key="ctx_clear"):
                    st.session_state.context_text      = ""
                    st.session_state.ctx_gen_notes     = ""
                    st.session_state.ctx_gen_info      = []
                    st.session_state.ctx_selected_files = []
                    st.rerun()
            with _ccb:
                if st.button("📂 → Files pane", use_container_width=True, key="ctx_go_files"):
                    st.session_state.build_sub = "files"
                    st.rerun()

            st.markdown('<hr class="hr">', unsafe_allow_html=True)

            # ╔══════════════════════════════════════╗
            # ║  MAIN PROMPT                          ║
            # ╚══════════════════════════════════════╝
            st.markdown(
                '<div class="lbl">✍️ Main Prompt</div>',
                unsafe_allow_html=True,
            )
            st.caption("Primary instruction — separated from context by `---` in the assembled prompt.")

            _pmt_new = st.text_area(
                "main_prompt_ta",
                value=st.session_state.prompt_text,
                height=220,
                placeholder=(
                    "Implement a secure JWT authentication system:\n\n"
                    "1. User registration with email validation\n"
                    "2. Login endpoint → access + refresh tokens\n"
                    "3. Token refresh mechanism\n"
                    "4. Middleware for route protection\n"
                    "5. bcrypt password hashing\n"
                    "6. Rate limiting on auth endpoints"
                ),
                label_visibility="collapsed",
            )
            if _pmt_new != st.session_state.prompt_text:
                st.session_state.prompt_text = _pmt_new

            # Token bar for prompt (prompt does have a counter since it feeds LLM directly)
            st.markdown(tok_bar(est(st.session_state.prompt_text)), unsafe_allow_html=True)

            # Templates
            st.markdown('<hr class="hr2">', unsafe_allow_html=True)
            st.markdown('<div class="lbl lbl-amber">⚡ Quick Templates</div>', unsafe_allow_html=True)
            _tc = st.columns(len(TEMPLATES))
            for _i, (_name, _tmpl) in enumerate(TEMPLATES.items()):
                with _tc[_i]:
                    if st.button(_name, use_container_width=True, key=f"tmpl_{_i}"):
                        st.session_state.prompt_text = _tmpl
                        st.rerun()

        # ──────────────────────────────────
        # RIGHT — Live Stats + Actions + Files
        # ──────────────────────────────────
        with _R:
            st.markdown('<div class="lbl lbl-blue">📊 Live Summary</div>', unsafe_allow_html=True)

            _asmb  = assemble(
                st.session_state.context_text,
                st.session_state.prompt_text,
                st.session_state.uploaded_files,
            )
            _ttok  = est(_asmb)
            _ctok  = est(st.session_state.context_text)
            _ptok  = est(st.session_state.prompt_text)
            _ftok  = sum(est(f["content"]) for f in st.session_state.uploaded_files.values()
                         if f.get("enabled", True))
            _nact  = sum(1 for f in st.session_state.uploaded_files.values() if f.get("enabled",True))

            _m1, _m2 = st.columns(2)
            _m1.metric("Total Tokens", f"{_ttok:,}")
            _m2.metric("Characters",   f"{len(_asmb):,}")
            _m3, _m4 = st.columns(2)
            _m3.metric("Active Files",  _nact)
            _m4.metric("Sections", _asmb.count("---")+1 if _asmb else 0)

            st.markdown('<hr class="hr2">', unsafe_allow_html=True)
            st.markdown(mini_breakdown(_ctok, _ptok, _ftok, _ttok), unsafe_allow_html=True)
            st.markdown('<hr class="hr2">', unsafe_allow_html=True)

            # Chunking status
            if _ttok > MAX_TOKENS:
                _nc_est = math.ceil(_ttok / int(st.session_state.chunk_size))
                st.warning(
                    f"⚠ Assembled prompt exceeds {MAX_TOKENS:,} tokens. "
                    f"~{_nc_est} chunks via "
                    f"{st.session_state.chunk_strategy.replace('_',' ').title()}."
                )
            else:
                st.success("✅ Fits within token limit.")

            st.markdown('<hr class="hr2">', unsafe_allow_html=True)

            # Files quick view
            st.markdown('<div class="lbl lbl-purple">📎 Attached Files</div>', unsafe_allow_html=True)
            if not st.session_state.uploaded_files:
                st.markdown(
                    '<div style="color:var(--muted);font-size:.7rem;padding:.4rem 0;">'
                    'No files. Switch to the Files pane to add.</div>',
                    unsafe_allow_html=True,
                )
            else:
                for _fname, _fd in list(st.session_state.uploaded_files.items()):
                    _icon   = file_icon(_fd["ext"])
                    _ftk    = est(_fd["content"])
                    _en     = _fd.get("enabled", True)
                    _short  = _fname if len(_fname) <= 24 else "…" + _fname[-23:]
                    _pill   = "pg" if _en else "pr"
                    _ptxt   = "on" if _en else "off"
                    _ck, _ci = st.columns([1, 5])
                    with _ck:
                        _nv = st.checkbox("", value=_en, key=f"chk_p_{_fname}",
                                          label_visibility="collapsed")
                        if _nv != _en:
                            st.session_state.uploaded_files[_fname]["enabled"] = _nv
                            st.rerun()
                    with _ci:
                        st.markdown(
                            f'<div class="frow" style="margin:0;">'
                            f'<div><span class="fn">{_icon} {_short}</span><br>'
                            f'<span class="fm">{_ftk:,} tokens</span></div>'
                            f'<span class="pill {_pill}">{_ptxt}</span></div>',
                            unsafe_allow_html=True,
                        )

            st.markdown('<hr class="hr2">', unsafe_allow_html=True)

            # Actions
            st.markdown('<div class="lbl">💾 Actions</div>', unsafe_allow_html=True)

            if st.button("📋 Assemble Prompt", use_container_width=True, type="primary"):
                st.session_state.assembled_prompt = _asmb
                st.success("Assembled! See Preview & Export tab.")

            if st.button("📂 Manage Files →", use_container_width=True):
                st.session_state.build_sub = "files"
                st.rerun()

            if st.button("🗑️ Clear All", use_container_width=True):
                if st.session_state._confirm_clear:
                    st.session_state.context_text      = ""
                    st.session_state.ctx_gen_notes     = ""
                    st.session_state.ctx_gen_info      = []
                    st.session_state.prompt_text       = ""
                    st.session_state.synthesized_prompt= ""
                    st.session_state.assembled_prompt  = ""
                    st.session_state._confirm_clear    = False
                    st.rerun()
                else:
                    st.session_state._confirm_clear = True
                    st.warning("Click again to confirm.")

    # ════════════════════════════════════════
    #  PANE B — SEND TO JULES (inline Jules session creation + history)
    # ════════════════════════════════════════
    elif st.session_state.build_sub == "jules":
        _JL, _JR = st.columns([2, 3], gap="large")

        with _JL:
            st.markdown('<div class="lbl">🚀 Create Jules Session</div>', unsafe_allow_html=True)

            _jsrc = st.radio(
                "Prompt source",
                ["assembled", "synthesized", "raw"],
                format_func=lambda x: {
                    "assembled":   "📦 Assembled (context + prompt + files)",
                    "synthesized": "🤖 Synthesized Output",
                    "raw":         "✍️ Raw Prompt Only",
                }[x],
            )

            _jpmt = (
                assemble(
                    st.session_state.context_text,
                    st.session_state.prompt_text,
                    st.session_state.uploaded_files,
                ) if _jsrc == "assembled"
                else st.session_state.synthesized_prompt or st.session_state.prompt_text
                if _jsrc == "synthesized"
                else st.session_state.prompt_text
            )

            _jtok = est(_jpmt)
            st.markdown(
                cap_bar(len(_jpmt), f"~{_jtok:,} tokens"),
                unsafe_allow_html=True,
            )
            if _jtok > MAX_TOKENS:
                st.warning(
                    f"⚠ {_jtok:,} tokens exceeds LLM limit. "
                    "Use the LLM Synthesis tab to compress first."
                )

            st.markdown('<hr class="hr2">', unsafe_allow_html=True)
            st.markdown('<div class="lbl lbl-amber">⚙️ Jules Config</div>', unsafe_allow_html=True)

            _auto_display = st.session_state.jules_automation or "— none —"
            _branch_display = st.session_state.jules_branch or "— (not set) —"
            for _lbl, _val in {
                "Title":      st.session_state.jules_title or "(untitled)",
                "Source":     st.session_state.jules_source or "(none)",
                "Branch":     _branch_display,
                "Mode":       _auto_display,
                "API Key":    "✅ set" if st.session_state.jules_api_key else "❌ NOT SET",
            }.items():
                st.markdown(
                    f'<div style="font-size:.68rem;margin:.16rem 0;">'
                    f'<span style="color:var(--muted)">{_lbl}:</span> '
                    f'<span style="color:var(--fg)">{_val}</span></div>',
                    unsafe_allow_html=True,
                )
            st.caption("Edit config in the sidebar ‹ Jules Config section.")

            st.markdown('<hr class="hr2">', unsafe_allow_html=True)

            # Generated prompt preview
            with st.expander("👁️ Preview Assembled Prompt", expanded=False):
                _jp_prev = _jpmt[:3000] + ("…" if len(_jpmt) > 3000 else "")
                st.text_area(
                    "prompt_prev_j", value=_jp_prev, height=220,
                    label_visibility="collapsed", key="jules_prompt_prev_ta",
                )

            if not st.session_state.jules_api_key:
                st.warning("⚠ Set Jules API Key in the sidebar first.")

            if st.button(
                "🚀 Create Jules Session",
                type="primary", use_container_width=True,
                disabled=not st.session_state.jules_api_key or not _jpmt.strip(),
            ):
                with st.spinner("Creating Jules session…"):
                    _ok, _result = create_session(_jpmt)
                _entry = {
                    "timestamp":      datetime.now().isoformat(),
                    "success":        _ok,
                    "result":         _result,
                    "prompt_preview": _jpmt[:300],
                    "tokens":         _jtok,
                    "config": {
                        "title":      st.session_state.jules_title,
                        "source":     st.session_state.jules_source,
                        "branch":     st.session_state.jules_branch,
                        "automation": st.session_state.jules_automation,
                    },
                }
                st.session_state.jules_sessions.insert(0, _entry)
                if _ok:
                    st.success("✅ Session created!")
                else:
                    st.error("❌ Failed")
                st.rerun()

        with _JR:
            st.markdown('<div class="lbl">📋 Session History</div>', unsafe_allow_html=True)
            if not st.session_state.jules_sessions:
                st.info("No sessions yet. Create one on the left.")
            else:
                _jc1, _jc2 = st.columns(2)
                _jc1.metric("Total", len(st.session_state.jules_sessions))
                _jc2.metric("✅ OK", sum(1 for s in st.session_state.jules_sessions if s["success"]))
                if st.button("🗑️ Clear History", use_container_width=True, key="clr_jh_b"):
                    st.session_state.jules_sessions = []
                    st.rerun()
                st.markdown('<hr class="hr2">', unsafe_allow_html=True)

                for _i, _sess in enumerate(st.session_state.jules_sessions):
                    _ts  = _sess["timestamp"][:19].replace("T", " ")
                    _sp  = "pg" if _sess["success"] else "pr"
                    _st  = "success" if _sess["success"] else "failed"
                    _ttl = _sess["config"].get("title") or f"Session #{len(st.session_state.jules_sessions)-_i}"
                    with st.expander(f"{'\u2705' if _sess['success'] else '\u274c'} {_ttl} — {_ts}", expanded=(_i == 0)):
                        _xc1, _xc2, _xc3 = st.columns(3)
                        _xc1.markdown(f'<span class="pill {_sp}">{_st}</span>', unsafe_allow_html=True)
                        _xc2.markdown(f'<span style="font-size:.67rem;color:var(--muted)">{_sess["tokens"]:,} tok</span>', unsafe_allow_html=True)
                        _xc3.markdown(f'<span style="font-size:.67rem;color:var(--muted)">{_sess["config"].get("automation") or "—"}</span>', unsafe_allow_html=True)
                        if _sess["success"]:
                            _sid  = (_sess["result"].get("name") or _sess["result"].get("id")
                                     or _sess["result"].get("sessionId") or "N/A")
                            _prurl = (_sess["result"].get("prUrl")
                                      or _sess["result"].get("pullRequestUrl")
                                      or _sess["result"].get("pr_url"))
                            st.markdown(
                                f'<div class="sess-card">'
                                f'<div style="color:var(--muted);font-size:.6rem;margin-bottom:.2rem;">SESSION ID</div>'
                                f'<div style="color:var(--blue);font-size:.67rem;word-break:break-all;">{_sid}</div>'
                                f'</div>',
                                unsafe_allow_html=True,
                            )
                            if _prurl:
                                st.markdown(f"[🔗 Open Pull Request]({_prurl})")
                            st.json(_sess["result"])
                        else:
                            st.error("Failed:")
                            st.json(_sess["result"])
                        st.markdown(
                            f'<div style="margin-top:.35rem;font-size:.63rem;color:var(--muted);">Prompt preview:</div>'
                            f'<div class="code-pre" style="max-height:80px;">'
                            f'{_sess["prompt_preview"][:400]}…</div>',
                            unsafe_allow_html=True,
                        )

    # ════════════════════════════════════════
    #  PANE C — FILE MANAGER (accessed via 'Manage Files' button)
    # ════════════════════════════════════════
    elif st.session_state.build_sub == "files":
        _UL, _FR = st.columns([5, 7], gap="large")

        with _UL:
            st.markdown('<div class="lbl lbl-blue">📤 Upload Files</div>', unsafe_allow_html=True)
            st.caption(
                "Supported: `.py` `.js` `.ts` `.html` `.css` `.json` `.md` `.sql` "
                "`.yaml` `.go` `.rs` `.rb` `.php` `.vue` `.toml` `.env` `.csv` …"
            )
            _uploaded = st.file_uploader(
                "Drop files",
                accept_multiple_files=True,
                type=[e.lstrip(".") for e in SUPPORTED_EXTENSIONS],
                label_visibility="collapsed",
            )
            if _uploaded:
                _added = 0
                for _uf in _uploaded:
                    if _uf.name not in st.session_state.uploaded_files:
                        _raw = _uf.read()
                        try:    _content = _raw.decode("utf-8")
                        except: _content = _raw.decode("latin-1")
                        _ext = "." + _uf.name.rsplit(".",1)[-1].lower() if "." in _uf.name else ""
                        st.session_state.uploaded_files[_uf.name] = {
                            "content":     _content,
                            "size":        len(_raw),
                            "ext":         _ext,
                            "enabled":     True,
                            "uploaded_at": datetime.now().isoformat(),
                        }
                        _added += 1
                if _added:
                    st.success(f"✅ Added {_added} file(s)")
                    st.rerun()

            st.markdown('<hr class="hr">', unsafe_allow_html=True)

            st.markdown('<div class="lbl lbl-amber">📋 Paste as File</div>', unsafe_allow_html=True)
            _pname = st.text_input("Filename", placeholder="snippet.md", key="paste_fn")
            _pcont = st.text_area("Content", height=150,
                                  placeholder="Paste code or text…",
                                  label_visibility="collapsed", key="paste_fc")
            if st.button("➕ Add as File", use_container_width=True):
                if _pname and _pcont:
                    _ext = "." + _pname.rsplit(".",1)[-1].lower() if "." in _pname else ".txt"
                    st.session_state.uploaded_files[_pname] = {
                        "content":     _pcont,
                        "size":        len(_pcont.encode()),
                        "ext":         _ext,
                        "enabled":     True,
                        "uploaded_at": datetime.now().isoformat(),
                    }
                    st.success(f"✅ Added {_pname}")
                    st.rerun()
                else:
                    st.error("Provide both filename and content.")

        with _FR:
            st.markdown('<div class="lbl lbl-purple">📁 File Library</div>', unsafe_allow_html=True)

            if not st.session_state.uploaded_files:
                st.info("No files yet. Upload or paste on the left.")
            else:
                _sort = st.selectbox("Sort", ["Name","Tokens","Size","Upload Time"], key="fsort")
                _fc1, _fc2, _fc3 = st.columns(3)
                if _fc1.button("✅ Enable All",  use_container_width=True):
                    for _k in st.session_state.uploaded_files:
                        st.session_state.uploaded_files[_k]["enabled"] = True
                    st.rerun()
                if _fc2.button("⬜ Disable All", use_container_width=True):
                    for _k in st.session_state.uploaded_files:
                        st.session_state.uploaded_files[_k]["enabled"] = False
                    st.rerun()
                if _fc3.button("🗑️ Remove All", use_container_width=True):
                    st.session_state.uploaded_files = {}
                    st.rerun()

                st.markdown('<hr class="hr2">', unsafe_allow_html=True)

                _items = list(st.session_state.uploaded_files.items())
                if _sort == "Name":       _items.sort(key=lambda x: x[0])
                elif _sort == "Tokens":   _items.sort(key=lambda x: est(x[1]["content"]), reverse=True)
                elif _sort == "Size":     _items.sort(key=lambda x: x[1]["size"], reverse=True)
                elif _sort == "Upload Time": _items.sort(key=lambda x: x[1].get("uploaded_at",""), reverse=True)

                for _fname, _fd in _items:
                    _icon = file_icon(_fd["ext"])
                    _ftk  = est(_fd["content"])
                    _fsz  = fmt_size(_fd["size"])
                    _en   = _fd.get("enabled", True)

                    with st.expander(f"{_icon} {_fname} — {_ftk:,} tok", expanded=False):
                        _xc1, _xc2, _xc3 = st.columns([2,2,1])
                        with _xc1:
                            st.markdown(f"**Size:** {_fsz}")
                            st.markdown(f"**Type:** `{_fd['ext']}`")
                        with _xc2:
                            st.markdown(f"**Tokens:** {_ftk:,}")
                            _ep = "pg" if _en else "pr"
                            st.markdown(
                                f'<span class="pill {_ep}">{"enabled" if _en else "disabled"}</span>',
                                unsafe_allow_html=True)
                        with _xc3:
                            if st.button("🗑️", key=f"rm_{_fname}"):
                                del st.session_state.uploaded_files[_fname]
                                st.rerun()

                        _nv2 = st.checkbox("Include in prompt", value=_en, key=f"en_{_fname}")
                        if _nv2 != _en:
                            st.session_state.uploaded_files[_fname]["enabled"] = _nv2
                            st.rerun()

                        _prev_src = _fd["content"][:2500]
                        st.code(_prev_src, language=_fd["ext"].lstrip(".") or "text")
                        if len(_fd["content"]) > 2500:
                            st.caption(f"…{len(_fd['content'])-2500:,} more chars")

                st.markdown('<hr class="hr2">', unsafe_allow_html=True)
                _tft  = sum(est(f["content"]) for f in st.session_state.uploaded_files.values())
                _eft  = sum(est(f["content"]) for f in st.session_state.uploaded_files.values()
                            if f.get("enabled", True))
                st.markdown(
                    f'<div style="color:var(--muted);font-size:.68rem;">'
                    f'Library total: <b style="color:var(--fg)">{_tft:,}</b> tokens &nbsp;·&nbsp; '
                    f'Active: <b style="color:var(--green)">{_eft:,}</b> tokens</div>',
                    unsafe_allow_html=True,
                )

        st.markdown('<hr class="hr2">', unsafe_allow_html=True)
        if st.button("← Back to Prompt Builder"):
            st.session_state.build_sub = "prompt"
            st.rerun()


# ═══════════════════════════════════════════════════
#  TAB 2 — LLM SYNTHESIS
# ═══════════════════════════════════════════════════
with tab_synth:
    st.markdown('<div class="lbl">🤖 LLM Prompt Synthesis</div>', unsafe_allow_html=True)
    st.caption(
        "Refine, expand, restructure, or compress your prompt with the LLM. "
        "Inputs exceeding the token limit are automatically chunked and processed in sequence."
    )

    _SL, _SR = st.columns([3, 2], gap="large")

    with _SL:
        _smode = st.radio(
            "Mode",
            ["refine","expand","restructure","summarize","custom"],
            format_func=lambda x: {
                "refine":"🎯 Refine & Clarify",
                "expand":"📈 Expand & Detail",
                "restructure":"🔄 Restructure",
                "summarize":"📉 Summarize & Compress",
                "custom":"✏️ Custom Instruction",
            }[x],
            horizontal=True,
        )
        _MODE_SYS = {
            "refine":       "You are an expert prompt engineer. Refine the following prompt to be clearer, more precise, and more actionable for an AI coding assistant. Remove ambiguity, add specificity. Return only the improved prompt.",
            "expand":       "You are a senior software architect. Expand the following prompt with additional technical details, edge cases, constraints, and implementation guidance. Return only the expanded prompt.",
            "restructure":  "You are a technical writer. Restructure the following prompt into a well-organized numbered format with clear sections. Preserve all original intent. Return only the restructured prompt.",
            "summarize":    "You are an expert at distilling complex instructions. Summarize the following prompt into a concise, high-impact version preserving all critical requirements. Return only the compressed prompt.",
            "custom":       "",
        }
        if _smode == "custom":
            _eff_sys = st.text_area(
                "Custom system instruction", value=st.session_state.llm_system,
                height=85, placeholder="You are an expert…")
        else:
            _eff_sys = _MODE_SYS[_smode]
            st.markdown(
                f'<div class="code-pre" style="max-height:65px;font-size:.64rem;">'
                f'{_eff_sys}</div>',
                unsafe_allow_html=True,
            )

        st.markdown('<hr class="hr2">', unsafe_allow_html=True)

        _ssrc = st.radio(
            "Input source",
            ["assembled","prompt_only","custom_input"],
            format_func=lambda x: {
                "assembled":    "Assembled Prompt (context + prompt + files)",
                "prompt_only":  "Raw Prompt Only",
                "custom_input": "Custom Input",
            }[x],
        )

        if _ssrc == "assembled":
            _sinput = assemble(
                st.session_state.context_text,
                st.session_state.prompt_text,
                st.session_state.uploaded_files,
            )
            st.info(f"Assembled prompt — {est(_sinput):,} tokens")
        elif _ssrc == "prompt_only":
            _sinput = st.session_state.prompt_text
            st.info(f"Raw prompt — {est(_sinput):,} tokens")
        else:
            _sinput = st.text_area(
                "Custom input", height=170,
                placeholder="Enter text to synthesize…",
                label_visibility="collapsed",
            )

        _stok = est(_sinput)
        st.markdown(
            cap_bar(len(_sinput), f"~{_stok:,} tokens / {MAX_TOKENS:,} max"),
            unsafe_allow_html=True,
        )

        if _stok > MAX_TOKENS:
            _sprev = do_chunk(
                _sinput,
                st.session_state.chunk_strategy,
                int(st.session_state.chunk_size),
                int(st.session_state.chunk_overlap),
            )
            st.markdown(
                f'<div style="font-size:.63rem;color:var(--amber);margin:.2rem 0 .1rem;">'
                f'⚠ Will process in {len(_sprev)} chunks</div>'
                + chunk_pills(_sprev),
                unsafe_allow_html=True,
            )

        if st.button("🚀 Synthesize", type="primary", use_container_width=True):
            if not _sinput.strip():
                st.error("No input text.")
            elif not st.session_state.llm_api_key:
                st.error("LLM API key not configured.")
            else:
                with st.spinner("Synthesizing…"):
                    _sres, _scomb = synth_chunked(_sinput, _eff_sys)
                if _scomb:
                    st.session_state.synthesized_prompt = _scomb
                    st.session_state.synthesis_history.append({
                        "timestamp": datetime.now().isoformat(),
                        "mode": _smode, "inp_tokens": _stok,
                        "chunks": len(_sres),
                        "ok": sum(1 for r in _sres if r["ok"]),
                        "results": _sres,
                    })
                    st.rerun()
                else:
                    for _r in _sres:
                        if not _r["ok"]:
                            st.error(f"Chunk {_r['idx']}: {_r['response']}")

    with _SR:
        st.markdown('<div class="lbl">📤 Synthesis Output</div>', unsafe_allow_html=True)

        if st.session_state.synthesized_prompt:
            _text = st.session_state.synthesized_prompt
            _otok = est(_text)

            # ── Metadata row ───────────────────────────
            _meta = st.session_state.get("_last_llm_meta", {})
            _usage = _meta.get("usage") or {}
            _mdl   = _meta.get("model") or st.session_state.llm_model
            _tot_t = _usage.get("total_tokens")
            _meta_parts = [f'<span class="pill pb">{_mdl}</span>']
            if _tot_t:
                _meta_parts.append(f'<span class="pill pp">{_tot_t:,} API tokens</span>')
            _meta_parts.append(f'<span class="pill pg">{_otok:,} est. tok</span>')
            st.markdown(
                '<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin:.25rem 0 .55rem;">'
                + " ".join(_meta_parts) + '</div>',
                unsafe_allow_html=True,
            )

            # ── Two-tab preview: Rendered | Raw ──────────────────
            _tv1, _tv2 = st.tabs(["Rendered Preview", "Raw / Edit"])

            with _tv1:
                # Render markdown — strip leading/trailing whitespace
                st.markdown(
                    '<div style="background:var(--bg-in);border:1px solid var(--border);'
                    'border-radius:6px;padding:.85rem 1rem;'
                    'font-size:.77rem;line-height:1.75;max-height:440px;overflow-y:auto;">',
                    unsafe_allow_html=True,
                )
                st.markdown(_text.strip())
                st.markdown('</div>', unsafe_allow_html=True)

            with _tv2:
                _edited = st.text_area(
                    "Raw output",
                    value=_text,
                    height=380,
                    label_visibility="collapsed",
                    key="synth_out",
                )
                if _edited != _text:
                    st.session_state.synthesized_prompt = _edited

            # ── Action buttons ───────────────────────────
            _oa, _ob, _oc = st.columns(3)
            if _oa.button("📋 Copy → Prompt", use_container_width=True):
                st.session_state.prompt_text = st.session_state.synthesized_prompt
                st.success("Copied to Main Prompt!")
                st.rerun()
            if _ob.button("📄 Copy → Context", use_container_width=True):
                st.session_state.context_text = st.session_state.synthesized_prompt
                st.success("Copied to Context!")
                st.rerun()
            if _oc.button("🗑️ Clear", use_container_width=True):
                st.session_state.synthesized_prompt = ""
                st.rerun()
        else:
            st.markdown(
                '<div style="color:var(--muted);font-size:.71rem;'
                'padding:2rem 0;text-align:center;">No synthesis yet.<br>'
                '<span style="font-size:.63rem;opacity:.6;">'
                'Run a synthesis on the left to see output here.</span></div>',
                unsafe_allow_html=True,
            )

        if st.session_state.synthesis_history:
            st.markdown('<hr class="hr2">', unsafe_allow_html=True)
            st.markdown('<div class="lbl">🕐 History</div>', unsafe_allow_html=True)
            for _he in reversed(st.session_state.synthesis_history[-5:]):
                _ts  = _he["timestamp"][:19].replace("T"," ")
                _ok  = _he.get("ok",0)
                _tot = _he.get("chunks",1)
                _sc  = "pg" if _ok==_tot else "pa"
                st.markdown(
                    f'<div class="sess-card">'
                    f'<b>{_he["mode"].title()}</b> '
                    f'<span class="pill {_sc}">{_ok}/{_tot} ok</span><br>'
                    f'<span style="color:var(--muted);font-size:.61rem;">'
                    f'{_ts} · {_he["inp_tokens"]:,} tok in</span></div>',
                    unsafe_allow_html=True,
                )
            if st.button("🗑️ Clear History", use_container_width=True, key="clr_sh"):
                st.session_state.synthesis_history = []
                st.rerun()


# ═══════════════════════════════════════════════════
#  TAB 3 — PREVIEW & EXPORT
# ═══════════════════════════════════════════════════
with tab_export:
    _aexp  = assemble(
        st.session_state.context_text,
        st.session_state.prompt_text,
        st.session_state.uploaded_files,
    )
    st.session_state.assembled_prompt = _aexp
    _texp  = est(_aexp)

    st.markdown('<div class="lbl">📊 Assembled Prompt — Preview & Export</div>', unsafe_allow_html=True)

    _e1,_e2,_e3,_e4,_e5 = st.columns(5)
    _e1.metric("Total Tokens",  f"{_texp:,}")
    _e2.metric("Characters",    f"{len(_aexp):,}")
    _e3.metric("Lines",         f"{_aexp.count(chr(10)):,}")
    _e4.metric("Active Files",  sum(1 for f in st.session_state.uploaded_files.values() if f.get("enabled",True)))
    _e5.metric("Sections",      _aexp.count("---")+1 if _aexp else 0)

    st.markdown(tok_bar(_texp), unsafe_allow_html=True)
    st.markdown('<hr class="hr2">', unsafe_allow_html=True)

    _EL, _ER = st.columns([3,2], gap="large")

    with _EL:
        st.markdown('<div class="lbl">📄 Full Assembled Prompt</div>', unsafe_allow_html=True)
        st.text_area("asmb_prev", value=_aexp, height=470,
                     label_visibility="collapsed", key="asmb_prev_ta")
        st.download_button(
            "⬇️ Download Assembled (.txt)",
            data=_aexp.encode("utf-8"),
            file_name=f"jules_prompt_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            mime="text/plain", use_container_width=True,
        )
        if st.session_state.synthesized_prompt:
            st.download_button(
                "⬇️ Download Synthesized (.txt)",
                data=st.session_state.synthesized_prompt.encode("utf-8"),
                file_name=f"jules_synth_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                mime="text/plain", use_container_width=True,
            )

    with _ER:
        st.markdown('<div class="lbl lbl-blue">🔀 Chunk Simulator</div>', unsafe_allow_html=True)

        if _aexp.strip():
            _ps  = st.selectbox("Strategy", ["sliding_window","semantic","hybrid"],
                                format_func=lambda x: x.replace("_"," ").title(), key="exp_s")
            _pcs = st.slider("Chunk size (tokens)", 1000, 60000,
                             int(st.session_state.chunk_size), 500, key="exp_cs")
            _pco = st.slider("Overlap (tokens)", 0, 5000,
                             int(st.session_state.chunk_overlap), 100, key="exp_co")

            if _texp > MAX_TOKENS:
                _ecks = do_chunk(_aexp, _ps, _pcs, _pco)
                st.markdown(
                    f'<div style="color:var(--amber);font-size:.7rem;margin-bottom:.35rem;">'
                    f'⚠ Split into <b>{len(_ecks)}</b> chunks</div>',
                    unsafe_allow_html=True,
                )
                for _ei, _ech in enumerate(_ecks):
                    with st.expander(f"Chunk {_ei+1}/{len(_ecks)} — {est(_ech):,} tokens"):
                        st.text_area(f"eck_{_ei}",
                                     value=_ech[:900]+("…" if len(_ech)>900 else ""),
                                     height=120, label_visibility="collapsed", key=f"ecp_{_ei}")
            else:
                st.success(f"✅ One pass ({_texp:,} / {MAX_TOKENS:,})")
                _ctx_e  = est(st.session_state.context_text)
                _pmt_e  = est(st.session_state.prompt_text)
                _fil_e  = sum(est(f["content"]) for f in st.session_state.uploaded_files.values()
                              if f.get("enabled",True))
                st.markdown(mini_breakdown(_ctx_e, _pmt_e, _fil_e, _texp), unsafe_allow_html=True)
        else:
            st.info("Build your prompt first.")

        st.markdown('<hr class="hr2">', unsafe_allow_html=True)
        st.markdown('<div class="lbl lbl-amber">📦 Export Session JSON</div>', unsafe_allow_html=True)

        _export = {
            "exported_at":   datetime.now().isoformat(),
            "prompt_studio": {
                "context":     st.session_state.context_text,
                "prompt":      st.session_state.prompt_text,
                "synthesized": st.session_state.synthesized_prompt,
                "assembled":   _aexp,
                "total_tokens": _texp,
            },
            "context_generation": {
                "mode":           st.session_state.ctx_input_mode,
                "selected_files": st.session_state.ctx_selected_files,
                "manual_notes":   st.session_state.ctx_gen_notes,
                "chunks":         st.session_state.ctx_gen_info,
            },
            "files": {
                k: {"ext":v["ext"],"size":v["size"],"enabled":v["enabled"],
                    "tokens":est(v["content"])}
                for k,v in st.session_state.uploaded_files.items()
            },
            "jules_config": {
                "title":      st.session_state.jules_title,
                "source":     st.session_state.jules_source,
                "branch":     st.session_state.jules_branch,
                "automation": st.session_state.jules_automation,
            },
            "sessions": [
                {"timestamp":s["timestamp"],"success":s["success"],
                 "tokens":s["tokens"],"config":s["config"],"result":s["result"]}
                for s in st.session_state.jules_sessions
            ],
        }
        st.download_button(
            "⬇️ Export Session (.json)",
            data=json.dumps(_export, indent=2).encode("utf-8"),
            file_name=f"jules_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
            mime="application/json", use_container_width=True,
        )