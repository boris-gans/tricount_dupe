# MyCount

This project is a full-stack web application designed to help individuals both track and split their expenses within a group. It provides a structured backend for data management and a responsive and sleek frontend for user interaction.

---

## Setup Instructions

### System requirements
- Git 2.40+
- Docker Desktop 24+ (includes Docker Compose v2)
- Optional for local (non-docker) development:
  - Python 3.11 (matches backend image `python:3.11-slim`)
  - Node.js 23.x and npm (matches frontend build stage `node:23`)
  - Access to a PostgreSQL 15 instance (a container from `docker compose` works)

### 1. Clone the repository
```bash
git clone https://github.com/<your-org>/tricount_dupe.git
cd tricount_dupe
```

### 2. Launch with Docker (recommended)
```bash
docker compose build
docker compose up -d
```
- Backend API: http://localhost:8000
- Frontend app: http://localhost:3000
- Database data persists in the `postgres_data` volume.

To stop the stack:
```bash
docker compose down
```

### 3. Run locally with Python + npm (alternative, no testing data)
1. Start the database using the compose service:
   ```bash
   docker compose up -d db
   ```
2. Configure backend dependencies:
   ```bash
   cd backend
   cp .env.example .env
   python -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
3. Start the backend API:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
4. In a new terminal, set up and run the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

> Tip: If you prefer a locally installed PostgreSQL server, make sure it mirrors the connection settings from `backend/.env` or update the variables accordingly.

### Running the tests
- **Backend with Docker:**
  ```bash
  docker compose run --rm backend pytest
  ```
- **Backend locally:** (from `backend` virtualenv)
  ```bash
  pytest
  ```
- **Frontend lint checks:** (from `frontend` directory)
  ```bash
  npm run lint
  ```

When running tests locally, keep the database container running so integration tests can reach PostgreSQL.


## App Usage
If you launched the app with Docker the database gets initialized with some testing data allowing you to easily explore the app. This includes Users, Groups and Expenses.


---

The login credentials for the **Users** are:

><ins>Name:</ins> Borja Serra Planelles <ins>Email:</ins> borja@gmail.com <ins>Pw:</ins> 1

><ins>Name:</ins> Boris Gans <ins>Email:</ins> borisgans@gmail.com <ins>Pw:</ins> 1

><ins>Name:</ins> Ryan M <ins>Email:</ins> rm@gmail.com <ins>Pw:</ins> 1

><ins>Name:</ins> Matt Porteous <ins>Email:</ins> mp@gmail.com <ins>Pw:</ins> 1

---

To join existing **Groups** you can use the following credentials, or use the unique invite link accessible through each **Groups** UI:

><ins>Group Name:</ins> Apartment <ins>Pw:</ins> 1

><ins>Group Name:</ins> Spring Break <ins>Pw:</ins> 1

><ins>Group Name:</ins> AWS <ins>Pw:</ins> 1

---