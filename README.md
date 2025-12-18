# 📈 Volatility & Risk Analysis Tool

A **work-in-progress quantitative finance project** for analysing financial volatility and risk metrics using historical market data.  
This project focuses on applying **Computer Science principles** to real-world quantitative problems.

<img width="1823" height="928" alt="image" src="https://github.com/user-attachments/assets/88798703-ab5f-48e2-8578-5b733545ecb3" />

Screenshot shown is from an early development stage and does not reflect the final design or feature set.
---

## ✨ Features

### Implemented
- (To be completed)

### In Progress / Planned
- (To be completed)


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


## ⚠️ Disclaimer
This project is for educational purposes only and does not constitute financial advice.
