import { msalInstance, loginRequest } from "./auth.js";

const FUNCTIONS_BASE_URL = "https://hojlmrrgkqvchqyggmbb.supabase.co/functions/v1";

const loginBtn = document.getElementById("loginBtn");
const output = document.getElementById("output");

async function initialize() {
    // Process redirect response (if we just came back from Microsoft)
    const response = await msalInstance.handleRedirectPromise();

    if (response) {
        msalInstance.setActiveAccount(response.account);
    }

    const account =
        msalInstance.getActiveAccount() ??
        msalInstance.getAllAccounts()[0];

    if (!account) {
        document.getElementById("status").textContent =
            "Please sign in.";
        return;
    }

    // If we already have a fresh ID token from the redirect,
    // reuse it. Otherwise silently obtain one.
    const idToken = response
        ? response.idToken
        : (
            await msalInstance.acquireTokenSilent({
                account,
                scopes: ["openid", "profile", "email"],
            })
        ).idToken;

    await initializeProtectedContent(idToken);

    displayAccount(account);
}


async function initializeProtectedContent(idToken) {
    showProtectedContent();

    const coursesLoaded = await loadCourses(idToken);
    const professorLoaded = await loadProfessors(idToken);

    if (!coursesLoaded || !professorLoaded){
        return;
    }

    document
        .getElementById("loadReviewsBtn")
        .addEventListener("click", () => {
            loadReviews(idToken);
        });
}

async function loadCourses(idToken) {
    const result = await fetch(
        `${FUNCTIONS_BASE_URL}/get-courses`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: idToken,
            }),
        }
    );

    const data = await result.json();

    if (!result.ok) {
        document.getElementById("status").textContent =
            "Failed to load courses.";
        return false;
    }

    if (!data.authorized) {
        showAccessDenied();
        return false;
    }

    const select = document.getElementById("courseSelect");

    select.innerHTML =
        `<option value="">All Courses</option>`;

    for (const course of data.courses) {
        const option = document.createElement("option");

        option.value = course.id;
        option.textContent = course.name;

        select.appendChild(option);
    }

    return true;
}

async function loadProfessors(idToken) {
    const result = await fetch(
        `${FUNCTIONS_BASE_URL}/get-professor`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: idToken,
            }),
        }
    );

    const data = await result.json();

    if (!result.ok) {
        document.getElementById("status").textContent =
            "Failed to load professors.";
        return false;
    }

    if (!data.authorized) {
        showAccessDenied();
        return false;
    }

    const select = document.getElementById("professorSelect");

    select.innerHTML =
        `<option value="">All Professors</option>`;

    for (const professor of data.professors) {
        const option = document.createElement("option");

        option.value = professor.id;
        option.textContent = professor.name;

        select.appendChild(option);
    }

    return true;
}

async function loadReviews(idToken) {

}

function renderReviews(reviews) {

}

/*
async function initializeProtectedContent(idToken) {
    const result = await fetch(
        "https://hojlmrrgkqvchqyggmbb.supabase.co/functions/v1/get-review",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: idToken,
                courseId: 786,
                professorId: 456,
            }),
        }
    );

    const data = await result.json();

    console.log("Authorization result:", data);
    console.table(data.reviews);

    if (!result.ok) {
        document.getElementById("status").textContent =
            "Authentication failed. Please try again later.";
        return;
    }

    if (data.authorized) {
        showProtectedContent();
    } else {
        showAccessDenied();
    }
}
*/

async function displayAccount(account) {

    output.textContent = `
Display Name:
${account.name}

Username:
${account.username}
`;
/*
Home Tenant:
${account.homeAccountId.split(".")[1]}

Issuing Tenant:
${claims.tid}

Subject:
${claims.sub}

Object ID:
${claims.oid}

Issuer:
${claims.iss}

Audience:
${claims.aud}
*/
}

function showProtectedContent() {
    document.getElementById("status").textContent = "";
    document.getElementById("protected-content").hidden = false;
}

function showAccessDenied() {
    document.getElementById("status").textContent =
        "Access denied. Your account is not authorized to view this site.";
    document.getElementById("protected-content").hidden = true;
}

loginBtn.addEventListener("click", async () => {
    await msalInstance.loginRedirect(loginRequest);
});

initialize().catch(console.error);