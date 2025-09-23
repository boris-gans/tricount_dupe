## Frontend
@frontend/ I need your help with my React + Vite frontend, since im terrible with JS development and design in general. Therefore, you should only work in the frontend directory. However, I will attatch my pydantic schema (this is a rough draft for now, I will add onto this later), as well as my api directory which specifies the different endpoints I've already created. @schemas.py @api/ I'm creating a web based Tricount dupe, designed to help individuals both track and split their expenses within a group. You have complete freedom to edit anything within the @frontend/ directory only. Please create: a landing page where I'll describe the app, a secure log in and sign up page reachable from the landing page, and a account overview that you see once you're logged in where you can view your groups. For the account overview page, ensure there's a button where you can create a new group and join an existing one (functionality I'll add later). This entire app should be in dark mode. For the more technical information, follow these instructions: Please also implement secure authentication and state handling:

When logging in or signing up, store the JWT returned by the backend in localStorage.

Reuse stored values (like JWT and userId) so users stay logged in after refresh.

Create a central API helper that automatically attaches the JWT in the Authorization header when making requests.

If the JWT is missing or invalid, redirect the user back to the login page.

Provide a logout function that clears localStorage and returns the user to the landing page.

Use a global context (or a lightweight state manager) for storing user/session info so multiple components can access it.