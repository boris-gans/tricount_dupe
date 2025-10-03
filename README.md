# Tricount Dupe (to be changed)

## Project Definition
This project is a full-stack web application designed to help individuals both track and split their expenses within a group. It provides a structured backend for data management and a responsive and sleek frontend for user interaction.

### Technologies Used
- **Backend:** FastAPI (Python), SQLAlchemy (ORM), Pydantic (data validation & schemas), PostgreSQL (database), Alembic (database migrations)
- **Frontend:** React (JavaScript), Vite
<!-- - **Other Tools:** ERD for database design, Local Storage for persisting user data   -->

---

## Features
- User + Group creation and authentication  
- Persistent user sessions via local storage  
- Database integration with SQLAlchemy models  
- API endpoints defined with FastAPI and validated with Pydantic  
- Database migrations for updating schema using Alembic
<!-- - (More features will be expanded here in the future…)   -->

---

## Software Development Life Cycle (SDLC) Model
This project follows the **Iterative Model** of the SDLC.  

### Why Iterative?
- Initial planning and design were done (system architecture, ERD, schemas)
- I began coding early to get a working prototype as soon as possible
- Development continues in small cycles: implement → test → refine → repeat

This approach balances planning with flexibility, which works best for my workflow and the scale of this project. I personally find it difficult to imagine the entire application and it's requirements at first, therefore I'd rather start developing ASAP and refine features later on.

**My Steps:**
1. Decide on backend + frontend technologies and create file structrue (with simple comments describing the purpose of each file)
2. Create first draft of ERD
3. Implement this on SQLAlchemy
4. Create rough draft of input and output models using Pydantic
5. Test app setup by creating the first simple API's (entity creation)
6. Quickly test these on the frontend by implementing simple API calls without any design
7. ...

---


## Database Design
Below is where the **Entity Relationship Diagram (ERD)** will be added to illustrate the database structure:

![ERD Placeholder](docs/erd_1.png)

For reference, the database is implemented with:
- **Pydantic Schemas** for data validation [View Pydantic Schema](./backend/app/db/schemas.py)
- **SQLAlchemy Models** for persistence [View DB Schema](./backend/app/db/models.py)

---

## Setup Instructions

### Prerequisites
- Python 3.10+  
- Node.js 18+ and npm or yarn  
- Git (for cloning the repository)  

---

### Setup
1. Copy `.env.example` → `.env`
   ```sh
   cp .env.example .env

2. Build the app
   ```sh
   docker compose up --build
   ```

Frontend available at: http://localhost:3000

API available at: http://localhost:8000