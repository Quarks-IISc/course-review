
import { msalInstance, loginRequest } from "./auth.js";

const FUNCTIONS_BASE_URL = "https://hojlmrrgkqvchqyggmbb.supabase.co/functions/v1";

const loginBtn = document.getElementById("loginBtn");
const output = document.getElementById("output");

let courses = [];
let professors = [];

const courseSearch =
    document.getElementById("courseSearch");

const courseSelect =
    document.getElementById("courseSelect");

const courseSuggestions =
    document.getElementById("courseSuggestions");

const professorSearch =
    document.getElementById("professorSearch");

const professorSelect =
    document.getElementById("professorSelect");

const professorSuggestions =
    document.getElementById("professorSuggestions");


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

    setupAutocomplete(
        courseSearch,
        courseSuggestions,
        courseSelect,
        courses
    );

    setupAutocomplete(
        professorSearch,
        professorSuggestions,
        professorSelect,
        professors
    );

    document
        .getElementById("loadReviewsBtn")
        .addEventListener("click", () => {
            console.log("Clicked!");
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

    courses = data.courses;
    console.log(courses);
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

    professors = data.professors;
    console.log(professors);
    return true;
}

async function loadReviews(idToken) {
    const courseId =
        document.getElementById("courseSelect").value;

    const professorId =
        document.getElementById("professorSelect").value;

    const result = await fetch(
        `${FUNCTIONS_BASE_URL}/get-review`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: idToken,
                courseId: courseId ? Number(courseId) : null,
                professorId: professorId ? Number(professorId) : null,
            }),
        }
    );

    const data = await result.json();

    if (!result.ok) {
        document.getElementById("status").textContent =
            "Failed to load reviews.";
        return;
    }

    if (!data.authorized) {
        showAccessDenied();
        return;
    }

    renderReviews(data.reviews);
}

function renderReviews(reviews) {
    const container = document.getElementById("reviews");

    container.innerHTML = "";

    if (reviews.length === 0) {
        container.textContent = "No matching reviews found.";
        return;
    }

    for (const review of reviews) {
        const card = document.createElement("div");

        card.className = "review-card";

        card.innerHTML = `
            <h3>${review.course}</h3>

            <p><strong>Professor:</strong> ${review.professor}</p>
            <p><strong>Year:</strong> ${review.year}</p>
            <p><strong>Term:</strong> ${review.term}</p>

            <p><strong>Course Review</strong></p>
            <p>${review.courseReview}</p>

            <p><strong>Professor Review</strong></p>
            <p>${review.professorReview}</p>

            <p>
                Recommendation: ${review.recommendation}/5<br>
                Difficulty: ${review.difficulty}/5<br>
                Leniency: ${review.leniency}/5
            </p>
        `;

        container.appendChild(card);
    }
}

async function displayAccount(account) {

    output.textContent = `
Display Name:
${account.name}

Username:
${account.username}
`;
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

function setupAutocomplete(
    searchInput,
    suggestionsContainer,
    hiddenInput,
    items
) {

    searchInput.addEventListener("input", () => {

        hiddenInput.value = "";

        const query =
            searchInput.value
                .toLowerCase()
                .trim();

        suggestionsContainer.innerHTML = "";

        if (!query) {
            return;
        }

        const matches =
            items.filter(item =>
                item.name
                    .toLowerCase()
                    .includes(query)
            );

        for (const item of matches) {

            const suggestion =
                document.createElement("div");

            suggestion.textContent =
                item.name;

            suggestion.addEventListener(
                "click",
                () => {

                    searchInput.value =
                        item.name;

                    hiddenInput.value =
                        item.id;

                    suggestionsContainer.innerHTML =
                        "";
                }
            );

            suggestionsContainer.appendChild(
                suggestion
            );
        }
    });
}