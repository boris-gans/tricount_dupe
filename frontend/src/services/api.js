export async function getMessage() {
    const res = await fetch("http://127.0.0.1:8000/")
    return res.json
}

export async function createUser(req) {
    const res = await fetch("http://127.0.0.1:8000/users/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(req),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to create user");
    }
    
    const data = await res.json();
    localStorage.setItem("userId", data.id);

    return res.json();
}

export async function createGroup(req) {
    const res = await fetch("http://127.0.0.1:8000/groups/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(req),
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to create group");
    }

    return res.json();
}