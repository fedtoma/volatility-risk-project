# 📈 Volatility & Risk Analysis Tool

A **work-in-progress quantitative finance project** for analysing financial volatility and risk metrics using historical market data.  
This project focuses on applying **Computer Science principles** to real-world quantitative problems.

<img width="1823" height="928" alt="image" src="https://github.com/user-attachments/assets/88798703-ab5f-48e2-8578-5b733545ecb3" />

Screenshot shown is from an early development stage and does not reflect the final design or feature set.

---

## ⚠️ Important Note

This project evolved from an earlier, simpler system into a more comprehensive application as additional features and ideas were explored over time. While this evolution was valuable from a learning and experimentation perspective, it also introduced a level of complexity that is ultimately unnecessary for a personal project of this nature.

As a result, the current focus is on **consolidation rather than expansion**. Existing components are being carefully refined, tested in isolation, and integrated more deliberately to ensure the system remains understandable, maintainable, and reliable.

The aim is not to maximise feature count, but to arrive at a **stable, well-tested, and coherent implementation** that clearly demonstrates functionality, design decisions, and engineering discipline. Development is therefore prioritising quality, clarity, and robustness over additional scope.

---

## ✨ Features

### Implemented
- Integrated local LLaMA-based language model with successful token streaming for real-time responses.
- Graphing functionality for all metrics is complete for stock-by-stock comparisons (for previous application version, but useful for new portfolio-level implementation).
- (more)

### In Progress / Planned
- Address mismatches between AI-generated insights and traffic-light indicators; indicators are rule-based (hardcoded), so discrepancies likely originate from AI response accuracy.
- Update graphing logic to dynamically support portfolio-level analysis with selectable individual stock overlays, while retaining the ability to display single-stock views on demand.
- Clarify the scope and effectiveness of range and volatility metrics, specifically whether they are applied at the portfolio construction stage or during graph-level analysis.
- Enable users to select individual stocks from a portfolio for standalone analysis, providing the same summaries and metrics available at the portfolio level **once portfolio functionality is fully finalised**.

### Current bugs / reinforcements to fix:
- stocks.py fails multi ticker close extraction test
- graph size only changes when hovered (should resize according to portfolio maker opening/closing)
- stock_cache must be stored in cache folder




---

## 🧰 Tech Stack

### Backend
- Python
- FastAPI
- NumPy
- Pandas

### Frontend
- Next.js (React)
- TypeScript
- Plotly

---

## 📁 Project Structure
```text
volatility-risk-project/
│
├── backend/                  # Python backend (API + analytics)
│   ├── .venv/
│   ├── cache/                # Local cached outputs (ignored)
│   ├── models/               # Local LLM model files (GGUF, ignored)
│   ├── routes/
│   │   ├── Metrics/          # Metric modules (returns, volatility, drawdowns, etc.)
│   │   └── PortfolioTools/   # Portfolio-level tools / workflows
│   ├── services/             # Core business logic + data processing
│   ├── utils/                # Shared helpers / utilities
│   └── main.py
│   └── requirements.txt
│
├── frontend/                 # Next.js dashboard (UI)
│   ├── src/
│   │   ├── app/              # Next.js App Router (pages/layout/api)
│   │   ├── components/       # Reusable UI components
│   │   ├── charts/           # Plotly chart components
│   │   ├── sections/         # Page sections (overview, metrics, portfolio)
│   │   ├── services/         # API client (frontend -> backend)
│   │   └── styles/           # CSS modules + global styles
│   ├── public/
│   └── package.json
│
├── .gitignore                # Repo-wide ignores (node_modules, .next, models, cache, venv, etc.)
└── README.md                 # Project overview + setup instructions
```

---

## ▶️ Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
### Frontend
```bash
cd frontend
npm install
npm run dev
```

---
# Application Architecture

## Search Architecture

The stock search feature is designed with a clear separation of responsibilities between the frontend and backend to ensure correctness, resilience, and a smooth user experience.

### Frontend (Client-Side)

- User input is **debounced** to avoid sending a request on every keystroke.
- Search queries are **URL-encoded** before being sent to prevent input corruption from special characters.
- In-flight requests are **cancelled** using `AbortController` when newer searches are initiated.
- A request ID mechanism ensures **only the latest response updates the UI**, preventing race conditions.
- Basic validation (e.g. empty input) is handled client-side to improve UX and reduce unnecessary API calls.

### Backend (Server-Side)

- The backend is the **source of truth** for validation.
- Query parameters are validated using FastAPI:
  - the `query` parameter is required
  - minimum and maximum length constraints are enforced
- Requests to the upstream Yahoo Finance API are protected by a **timeout** to prevent blocking.
- Upstream failures (network errors, timeouts, non-2xx responses) are translated into **502 Bad Gateway** responses.
- Invalid or malformed upstream JSON responses are handled gracefully and do not crash the API.
- Structured logging is used to record request lifecycle events and upstream failures.

### Design Principles

- Validation is applied **defensively at multiple layers**:
  - frontend validation improves usability
  - backend validation guarantees correctness and security
- Overlapping search requests are expected and safely handled.
- The system prioritises **robustness and predictable behaviour** over optimistic assumptions.

---

## ⚠️ Disclaimer
This project is for educational purposes only and does not constitute financial advice.
