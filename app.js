import { msalInstance, loginRequest } from "./auth.js";

const loginBtn = document.getElementById("loginBtn");
const output = document.getElementById("output");

async function initialize() {
    // Process the redirect response (if we just came back from Microsoft)
    const response = await msalInstance.handleRedirectPromise();

    if (response) {
        // Set the newly signed-in account as active
        msalInstance.setActiveAccount(response.account);

        const result = await fetch(
            "https://hojlmrrgkqvchqyggmbb.supabase.co/functions/v1/authorize-user",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token: response.idToken,
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

        console.log("Edge Function response:", data);
    }

    // If we already have an account, use it
    const account =
        msalInstance.getActiveAccount() ??
        msalInstance.getAllAccounts()[0];

    if (account) {
        displayAccount(account);
    }
}

async function displayAccount(account) {

    const tokenResponse = await msalInstance.acquireTokenSilent({
        account,
        scopes: ["openid", "profile", "email"]
    });

    const claims = tokenResponse.idTokenClaims;

    output.textContent = `
Display Name:
${account.name}

Username:
${account.username}

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