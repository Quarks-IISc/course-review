import { msalInstance, loginRequest } from "./auth.js";

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

    await authorizeUser(idToken);

    displayAccount(account);
}

async function authorizeUser(idToken) {
    const result = await fetch(
        "https://hojlmrrgkqvchqyggmbb.supabase.co/functions/v1/authorize-user",
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

    console.log("Authorization result:", data);

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