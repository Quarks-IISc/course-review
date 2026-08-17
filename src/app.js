
import { msalInstance, loginRequest } from "./auth.js";

const FUNCTIONS_BASE_URL = "https://hojlmrrgkqvchqyggmbb.supabase.co/functions/v1";

const loginBtn = document.getElementById("loginBtn");
const output = document.getElementById("output");

let courses = [];
let professors = [];

// fzf-style fuzzy match: query chars just need to appear in order in the
// target. Consecutive runs and early matches score higher.
function fuzzyScore(query, target) {
    query = query.toLowerCase();
    target = target.toLowerCase();

    let qi = 0;
    let score = 0;
    let consecutive = 0;
    let firstMatchIndex = -1;

    for (let ti = 0; ti < target.length && qi < query.length; ti++) {
        if (target[ti] === query[qi]) {
            if (firstMatchIndex === -1) firstMatchIndex = ti;
            score += 1 + consecutive;
            consecutive++;
            qi++;
        } else {
            consecutive = 0;
        }
    }

    if (qi < query.length) return -1;

    score += Math.max(0, 5 - firstMatchIndex);
    return score;
}

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
    let response = null;
    try {
        response = await msalInstance.handleRedirectPromise();
    } catch (err) {
        console.error("MSAL redirect handling failed:", err);
        document.getElementById("status").textContent =
            "Sign-in failed (" + (err.errorCode || err.message || "unknown error") + "). Please try again.";
        return;
    }

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
    let idToken;
    try {
        idToken = response
            ? response.idToken
            : (
                await msalInstance.acquireTokenSilent({
                    account,
                    scopes: ["openid", "profile", "email"],
                })
            ).idToken;
    } catch (err) {
        console.error("Failed to acquire token:", err);
        document.getElementById("status").textContent =
            "Your session expired. Please sign in again.";
        return;
    }

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

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[ch]);
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
            <h3>${escapeHtml(review.course)}</h3>

            <p><strong>Professor:</strong> ${escapeHtml(review.professor)}</p>
            <p><strong>Year:</strong> ${escapeHtml(review.year)}</p>
            <p><strong>Term:</strong> ${escapeHtml(review.term)}</p>

            <p><strong>Course Review</strong></p>
            <p>${escapeHtml(review.courseReview)}</p>

            <p><strong>Professor Review</strong></p>
            <p>${escapeHtml(review.professorReview)}</p>

            <p>
                Recommendation: ${escapeHtml(review.recommendation)}/5<br>
                Difficulty: ${escapeHtml(review.difficulty)}/5<br>
                Leniency: ${escapeHtml(review.leniency)}/5
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

initialize().catch((err) => {
    console.error("Unexpected error during sign-in:", err);
    const status = document.getElementById("status");
    if (status) {
        status.textContent = "Something went wrong during sign-in. Please refresh and try again.";
    }
});

function setupAutocomplete(
    searchInput,
    suggestionsContainer,
    hiddenInput,
    items
) {
    let selectedIndex = -1;

    function closeSuggestions() {
        suggestionsContainer.innerHTML = "";
        suggestionsContainer.classList.remove("visible");
        selectedIndex = -1;
    }

    function selectItem(item) {
        searchInput.value = item.name;
        hiddenInput.value = item.id;

        searchInput.classList.add("selected");

        closeSuggestions();
    }

    function renderSuggestions(query) {
        suggestionsContainer.innerHTML = "";
        selectedIndex = -1;

        if (!query) {
            closeSuggestions();
            return;
        }

        const matches = items
            .map(item => ({ item, score: fuzzyScore(query, item.name) }))
            .filter(m => m.score >= 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(m => m.item);

        if (matches.length === 0) {
            const empty = document.createElement("div");
            empty.className = "autocomplete-empty";
            empty.textContent = "No matches found";
            suggestionsContainer.appendChild(empty);

            suggestionsContainer.classList.add("visible");
            return;
        }

        matches.forEach((item, index) => {
            const suggestion = document.createElement("div");

            suggestion.className = "autocomplete-option";
            suggestion.textContent = item.name;

            suggestion.addEventListener("mousedown", (event) => {
                // Prevent the input's blur event from firing first
                event.preventDefault();
                selectItem(item);
            });

            suggestionsContainer.appendChild(suggestion);
        });

        suggestionsContainer.classList.add("visible");
    }

    searchInput.addEventListener("input", () => {
        // Any modification invalidates the previous selection
        hiddenInput.value = "";
        searchInput.classList.remove("selected");

        const query = searchInput.value
            .toLowerCase()
            .trim();

        renderSuggestions(query);
    });

    searchInput.addEventListener("keydown", (event) => {
        const options =
            suggestionsContainer.querySelectorAll(
                ".autocomplete-option"
            );

        if (!options.length) {
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();

            selectedIndex =
                (selectedIndex + 1) % options.length;

        } else if (event.key === "ArrowUp") {
            event.preventDefault();

            selectedIndex =
                (selectedIndex - 1 + options.length) %
                options.length;

        } else if (event.key === "Enter") {
            event.preventDefault();

            if (selectedIndex >= 0) {
                options[selectedIndex].dispatchEvent(
                    new MouseEvent("mousedown")
                );
            }

            return;

        } else if (event.key === "Escape") {
            closeSuggestions();
            return;
        } else {
            return;
        }

        options.forEach((option, index) => {
            option.classList.toggle(
                "active",
                index === selectedIndex
            );
        });
    });

    searchInput.addEventListener("focus", () => {
        const query = searchInput.value
            .toLowerCase()
            .trim();

        if (query) {
            renderSuggestions(query);
        }
    });

    searchInput.addEventListener("blur", () => {
        // Delay closing so clicking a suggestion still works
        setTimeout(() => {
            closeSuggestions();

            // If the user typed something but didn't select
            // an actual item, clear it.
            if (!hiddenInput.value) {
                searchInput.value = "";
            }
        }, 150);
    });
}