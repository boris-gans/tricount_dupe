# Frontend

## 1 (cursor)
@frontend/ I need your help with my React + Vite frontend, since im terrible with JS development and design in general. Therefore, you should only work in the frontend directory. However, I will attatch my pydantic schema (this is a rough draft for now, I will add onto this later), as well as my api directory which specifies the different endpoints I've already created. @schemas.py @api/ I'm creating a web based Tricount dupe, designed to help individuals both track and split their expenses within a group. You have complete freedom to edit anything within the @frontend/ directory only. Please create: a landing page where I'll describe the app, a secure log in and sign up page reachable from the landing page, and a account overview that you see once you're logged in where you can view your groups. For the account overview page, ensure there's a button where you can create a new group and join an existing one (functionality I'll add later). This entire app should be in dark mode. For the more technical information, follow these instructions: Please also implement secure authentication and state handling:

When logging in or signing up, store the JWT returned by the backend in localStorage.

Reuse stored values (like JWT and userId) so users stay logged in after refresh.

Create a central API helper that automatically attaches the JWT in the Authorization header when making requests.

If the JWT is missing or invalid, redirect the user back to the login page.

Provide a logout function that clears localStorage and returns the user to the landing page.

Use a global context (or a lightweight state manager) for storing user/session info so multiple components can access it.

## 2 (codex)
Only edit the frontend direcotry. The frontend uses vite + react, and is in both jsx and js. As of yet, I have auth setup, allowing the user to signup and login and store its jwt token. The jwt automaticlaly gets included in all api calls. Ive added a bunch of new endpoints and I want to update the frontend. Lets start with groups for now: in @groups.py you can see Ive added a /join endpoint and a /view-short endpoint. When a user succesfully creates a group or joins one, you should open a new router (/account/{group-name}) showing the details of that current group. At the top left in large font show the emoji as a group profile picture, and the name of the group to the side. Below this the user has the option to switch between expenses and balances (default is expenses). For the expenses page you should list every ExpenseOut object included in the response, including only the name of the paid_by.name field (user's name), the amount, the photo_url (or an empty image box on the left), and the description as the title. For the balances page you should list out every UserBalanceOut obkect included in the response, including only their name and balance. Refer to @schemas.py for field names and relationships. Make your changes in @api.js and create new components for the new routers.


## 3 (codex)

I've just updated my join_group endpoint [groups.py](backend/app/api/groups.py) and added a new endpoint, create_group_invite. I also made a change to the GroupJoinIn schema in [schemas.py](backend/app/db/schemas.py) as well as added a new GroupInviteOut schema. Im generating unique one time use (with expiration time) tokens that can be used an invite link. Update my join group functionality to first include the Group Invite Link field, and below that add an option for just including the group name and password. Make sure you update the request body according to the new schema. Also, when viewing a Group, create a new button "Invite a Friend!" thats directly to the left of the create expense button. When you click this button you should request the create-invite endpoint and show the link to the user so they can easily copy and paste. I also want you to add this Invite a friend button in the balances tab, if the group the user is in is empty (other than the current user). Dont display the actual balances in this case but only the invite a friend button.

**Response:**
Changes

Reworked the join dialog to accept invite tokens or the classic name/password combo, building the correct payload for the new schema (src/features/groups/AccountHome.jsx:152).
Added an “Invite a Friend!” call-to-action beside the add-expense button plus a reusable helper to fetch invite links from the backend (src/features/groups/GroupDetails.jsx:453, src/services/api.js:89).
Introduced an invite-link dialog with clipboard support so members can copy the generated URL on demand (src/features/groups/GroupDetails.jsx:553).
Updated the balances tab to surface the invite button (and hide balances) when you’re the sole member, while preserving the new positive/negative formatting when others are present (src/features/groups/GroupDetails.jsx:506).

## 4 (codex)

Can you replace all the alerts in the frontend with for user friendly messages below the input field that caused that error response? For example in [AccountHome.jsx](frontend/src/features/groups/AccountHome.jsx) when a status code of 400 is received when a user tries to join a group, you should output the "detail" field of that response directly above the button pressed (Join group in this case). Use this error handing for all api requests throughout the frontend only.

**Response:**
Alerts Replaced

Login/signup now surface backend errors as inline helper text above the submit button, avoiding disruptive alerts (src/App.jsx:44).
Group creation and join modals display validation or API errors right inside the dialog, tied to the relevant controls (src/features/groups/AccountHome.jsx:108).
Group details view shows invite/link issues next to the trigger buttons and inside the share dialog; clipboard problems render inline instead of alerting (src/features/groups/GroupDetails.jsx:453).
Clipboard and invite flows reset their inline status messages when retried or dismissed, maintaining a consistent feedback pattern.


## 5 (codex)
Now that im done with both my frontend and backend, I want to create unit tests for my backend. It should test: happy path, edge cases, and failure cases. You should test everything within my services directory, all my endpoints, and everything in [security.py](backend/app/core/security.py). Aim for at least 80% coverage. Use the tests direcotry (within backend).

**Response:**
Built out automated test coverage for the FastAPI backend. Added a shared testing harness with in‑memory SQLite, dependency overrides, and reusable auth helpers (backend/tests/conftest.py:1). Wrote unit tests for hashing/JWT helpers plus user/group dependencies (backend/tests/test_security.py:1), service-level coverage for expenses (backend/tests/services/test_expense_service.py:1) and groups (backend/tests/services/test_group_service.py:1), and end-to-end API exercises for auth (backend/tests/api/test_auth_endpoints.py:1), groups (backend/tests/api/test_group_endpoints.py:1), and expenses (backend/tests/api/test_expense_endpoints.py:1). Attempted to run pytest with coverage, but dependency installation was blocked; recommend pip install -r backend/requirements.txt and then running cd backend && pytest --cov=app --cov-report=term-missing tests when you’re ready.