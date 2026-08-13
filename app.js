import { msalInstance, loginRequest } from "./auth.js";

const FUNCTIONS_BASE_URL =
    "https://hojlmrrgkqvchqyggmbb.supabase.co/functions/v1";


const loginBtn = document.getElementById("loginBtn");
const status = document.getElementById("status");


// --------------------------------------------------
// AUTOCOMPLETE DATA
// --------------------------------------------------

let courses = [];
let professors = [];


// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------

async function initialize() {

    const response =
        await msalInstance.handleRedirectPromise();

    if (response) {
        msalInstance.setActiveAccount(response.account);
    }

    const account =
        msalInstance.getActiveAccount() ??
        msalInstance.getAllAccounts()[0];

    if (!account) {

        status.textContent =
            "Sign in with your IISc account to continue.";

        return;
    }


    const idToken = response
        ? response.idToken
        : (
            await msalInstance.acquireTokenSilent({
                account,
                scopes: ["openid", "profile", "email"],
            })
        ).idToken;


    await initializeProtectedContent(idToken);
}


// --------------------------------------------------
// PROTECTED CONTENT
// --------------------------------------------------

async function initializeProtectedContent(idToken) {

    showProtectedContent();

    const coursesLoaded =
        await loadCourses(idToken);

    const professorsLoaded =
        await loadProfessors(idToken);


    if (!coursesLoaded || !professorsLoaded) {
        return;
    }


    setupAutocomplete(
        "courseSearch",
        "courseSuggestions",
        "courseSelect",
        courses
    );


    setupAutocomplete(
        "professorSearch",
        "professorSuggestions",
        "professorSelect",
        professors
    );


    document
        .getElementById("loadReviewsBtn")
        .addEventListener("click", () => {
            loadReviews(idToken);
        });
}


// --------------------------------------------------
// LOAD COURSES
// --------------------------------------------------

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

        status.textContent =
            "Failed to load courses.";

        return false;
    }


    if (!data.authorized) {

        showAccessDenied();

        return false;
    }


    courses = data.courses;

    return true;
}


// --------------------------------------------------
// LOAD PROFESSORS
// --------------------------------------------------

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

        status.textContent =
            "Failed to load professors.";

        return false;
    }


    if (!data.authorized) {

        showAccessDenied();

        return false;
    }


    professors = data.professors;

    return true;
}


// --------------------------------------------------
// AUTOCOMPLETE
// --------------------------------------------------

function setupAutocomplete(
    inputId,
    suggestionsId,
    hiddenId,
    items
) {

    const input =
        document.getElementById(inputId);

    const suggestions =
        document.getElementById(suggestionsId);

    const hidden =
        document.getElementById(hiddenId);


    let activeIndex = -1;


    function showSuggestions() {

        const query =
            input.value.trim();


        if (!query) {

            suggestions.hidden = true;
            suggestions.innerHTML = "";

            hidden.value = "";

            return;
        }


        const matches =
            items
                .map(item => ({
                    item,
                    score: fuzzyScore(
                        query,
                        item.name
                    )
                }))
                .filter(result => result.score > 0.25)
                .sort(
                    (a, b) =>
                        b.score - a.score
                )
                .slice(0, 7);


        suggestions.innerHTML = "";

        activeIndex = -1;


        if (matches.length === 0) {

            suggestions.innerHTML = `
                <div class="no-results">
                    No matching results
                </div>
            `;

            suggestions.hidden = false;

            return;
        }


        matches.forEach(
            ({ item }, index) => {

                const button =
                    document.createElement("button");

                button.type = "button";

                button.className =
                    "suggestion";

                button.innerHTML =
                    highlightMatch(
                        item.name,
                        query
                    );


                button.addEventListener(
                    "mousedown",
                    event => {
                        event.preventDefault();

                        selectItem(item);
                    }
                );


                suggestions.appendChild(button);
            }
        );


        suggestions.hidden = false;
    }


    function selectItem(item) {

        input.value = item.name;

        hidden.value = item.id;

        suggestions.hidden = true;

        suggestions.innerHTML = "";

        activeIndex = -1;
    }


    function updateActiveSuggestion() {

        const buttons =
            suggestions.querySelectorAll(
                ".suggestion"
            );


        buttons.forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


        if (
            activeIndex >= 0 &&
            activeIndex < buttons.length
        ) {

            buttons[activeIndex]
                .classList.add("active");

            buttons[activeIndex]
                .scrollIntoView({
                    block: "nearest"
                });
        }
    }


    input.addEventListener(
        "input",
        () => {

            /*
             * Once the user changes the text,
             * the previous selection is no
             * longer considered valid.
             */
            hidden.value = "";

            showSuggestions();
        }
    );


    input.addEventListener(
        "keydown",
        event => {

            const buttons =
                suggestions.querySelectorAll(
                    ".suggestion"
                );


            if (
                event.key === "ArrowDown"
            ) {

                if (!buttons.length) {
                    return;
                }

                event.preventDefault();

                activeIndex =
                    Math.min(
                        activeIndex + 1,
                        buttons.length - 1
                    );

                updateActiveSuggestion();
            }


            else if (
                event.key === "ArrowUp"
            ) {

                if (!buttons.length) {
                    return;
                }

                event.preventDefault();

                activeIndex =
                    Math.max(
                        activeIndex - 1,
                        0
                    );

                updateActiveSuggestion();
            }


            else if (
                event.key === "Enter"
            ) {

                if (
                    activeIndex >= 0 &&
                    buttons[activeIndex]
                ) {

                    event.preventDefault();

                    buttons[activeIndex]
                        .click();
                }
            }


            else if (
                event.key === "Escape"
            ) {

                suggestions.hidden = true;

                activeIndex = -1;
            }
        }
    );


    input.addEventListener(
        "focus",
        () => {

            if (input.value.trim()) {
                showSuggestions();
            }
        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !event.target.closest(
                    ".autocomplete"
                )
            ) {

                suggestions.hidden = true;

                activeIndex = -1;
            }
        }
    );
}


// --------------------------------------------------
// FUZZY SEARCH
// --------------------------------------------------

function fuzzyScore(query, text) {

    query =
        query
            .toLowerCase()
            .trim();

    text =
        text
            .toLowerCase()
            .trim();


    if (!query) {
        return 0;
    }


    // Exact match
    if (query === text) {
        return 1;
    }


    // Direct substring match
    if (text.includes(query)) {

        return (
            0.85 +
            (query.length / text.length) * 0.15
        );
    }


    /*
     * Compare individual words.
     *
     * This makes:
     *
     * "quantum computng"
     *
     * work well against:
     *
     * "Introduction to Quantum Computing"
     */

    const queryWords =
        query.split(/\s+/);

    const textWords =
        text.split(/\s+/);


    let wordScore = 0;


    for (const queryWord of queryWords) {

        let bestWordScore = 0;


        for (const textWord of textWords) {

            const distance =
                levenshteinDistance(
                    queryWord,
                    textWord
                );


            const similarity =
                1 -
                distance /
                Math.max(
                    queryWord.length,
                    textWord.length
                );


            if (
                textWord.startsWith(queryWord)
            ) {

                bestWordScore =
                    Math.max(
                        bestWordScore,
                        0.9
                    );

            }
            else {

                bestWordScore =
                    Math.max(
                        bestWordScore,
                        similarity
                    );
            }
        }


        wordScore += bestWordScore;
    }


    wordScore /=
        queryWords.length;


    /*
     * Character-level similarity.
     *
     * Useful for typos such as:
     *
     * "quantm"
     * "computng"
     * "profesor"
     */

    const distance =
        levenshteinDistance(
            query,
            text
        );


    const characterScore =
        1 -
        distance /
        Math.max(
            query.length,
            text.length
        );


    return (
        0.7 * wordScore +
        0.3 * characterScore
    );
}


// --------------------------------------------------
// LEVENSHTEIN DISTANCE
// --------------------------------------------------

function levenshteinDistance(a, b) {

    const matrix = [];


    for (
        let i = 0;
        i <= b.length;
        i++
    ) {

        matrix[i] = [i];
    }


    for (
        let j = 0;
        j <= a.length;
        j++
    ) {

        matrix[0][j] = j;
    }


    for (
        let i = 1;
        i <= b.length;
        i++
    ) {

        for (
            let j = 1;
            j <= a.length;
            j++
        ) {

            if (
                b.charAt(i - 1) ===
                a.charAt(j - 1)
            ) {

                matrix[i][j] =
                    matrix[i - 1][j - 1];

            }
            else {

                matrix[i][j] =
                    Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
            }
        }
    }


    return matrix[b.length][a.length];
}


// --------------------------------------------------
// HIGHLIGHT SEARCH MATCH
// --------------------------------------------------

function highlightMatch(text, query) {

    const index =
        text
            .toLowerCase()
            .indexOf(
                query.toLowerCase()
            );


    if (index === -1) {
        return escapeHTML(text);
    }


    const before =
        text.substring(
            0,
            index
        );

    const match =
        text.substring(
            index,
            index + query.length
        );

    const after =
        text.substring(
            index + query.length
        );


    return `
        ${escapeHTML(before)}
        <mark>${escapeHTML(match)}</mark>
        ${escapeHTML(after)}
    `;
}


// --------------------------------------------------
// HTML ESCAPING
// --------------------------------------------------

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// --------------------------------------------------
// LOAD REVIEWS
// --------------------------------------------------

async function loadReviews(idToken) {

    const courseId =
        document.getElementById(
            "courseSelect"
        ).value;


    const professorId =
        document.getElementById(
            "professorSelect"
        ).value;


    const result = await fetch(
        `${FUNCTIONS_BASE_URL}/get-review`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({

                token: idToken,

                courseId:
                    courseId
                        ? Number(courseId)
                        : null,

                professorId:
                    professorId
                        ? Number(professorId)
                        : null,
            }),
        }
    );


    const data =
        await result.json();


    if (!result.ok) {

        status.textContent =
            "Failed to load reviews.";

        return;
    }


    if (!data.authorized) {

        showAccessDenied();

        return;
    }


    renderReviews(data.reviews);
}


// --------------------------------------------------
// RENDER REVIEWS
// --------------------------------------------------

function renderReviews(reviews) {

    const container =
        document.getElementById("reviews");


    container.innerHTML = "";


    if (reviews.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No matching reviews found.
            </div>
        `;

        return;
    }


    for (const review of reviews) {

        const card =
            document.createElement("article");


        card.className =
            "review-card";


        card.innerHTML = `

            <h3>
                ${escapeHTML(review.course)}
            </h3>

            <div class="review-meta">

                <strong>Professor:</strong>
                ${escapeHTML(review.professor)}

                &nbsp; · &nbsp;

                ${escapeHTML(String(review.year))}

                &nbsp; · &nbsp;

                ${escapeHTML(review.term)}

            </div>


            <div class="review-block">

                <h4>Course Review</h4>

                <p>
                    ${escapeHTML(review.courseReview)}
                </p>

            </div>


            <div class="review-block">

                <h4>Professor Review</h4>

                <p>
                    ${escapeHTML(review.professorReview)}
                </p>

            </div>


            <div class="rating-row">

                <div class="rating">
                    Recommendation:
                    <strong>
                        ${review.recommendation}/5
                    </strong>
                </div>

                <div class="rating">
                    Difficulty:
                    <strong>
                        ${review.difficulty}/5
                    </strong>
                </div>

                <div class="rating">
                    Leniency:
                    <strong>
                        ${review.leniency}/5
                    </strong>
                </div>

            </div>
        `;


        container.appendChild(card);
    }
}


// --------------------------------------------------
// AUTH UI
// --------------------------------------------------

function showProtectedContent() {

    status.textContent = "";

    document
        .getElementById("loginBtn")
        .hidden = true;

    document
        .getElementById("protected-content")
        .hidden = false;
}


function showAccessDenied() {

    status.textContent =
        "Access denied. Your account is not authorized to view this site.";

    document
        .getElementById("protected-content")
        .hidden = true;

    document
        .getElementById("loginBtn")
        .hidden = false;
}


// --------------------------------------------------
// LOGIN
// --------------------------------------------------

loginBtn.addEventListener(
    "click",
    async () => {

        await msalInstance.loginRedirect(
            loginRequest
        );
    }
);


// --------------------------------------------------
// START
// --------------------------------------------------

initialize().catch(error => {

    console.error(error);

    status.textContent =
        "Something went wrong while initializing the site.";
});