import { msalInstance, loginRequest } from "./auth.js";

const loginBtn = document.getElementById("loginBtn");
const output = document.getElementById("output");

async function initialize() {
    // Process the redirect response (if we just came back from Microsoft)
    const response = await msalInstance.handleRedirectPromise();

    if (response) {
        // Set the newly signed-in account as active
        msalInstance.setActiveAccount(response.account);
    }

    // If we already have an account, use it
    const account =
        msalInstance.getActiveAccount() ??
        msalInstance.getAllAccounts()[0];

    if (account) {
        displayAccount(account);
    }
}

function displayAccount(account) {
    const claims = account.idTokenClaims || {};

    output.textContent = `
Display Name: ${account.name ?? "N/A"}

Username: ${account.username}

Home Account ID:
${account.homeAccountId}

Home Tenant ID:
${account.homeAccountId.split(".")[1]}

Issuing Tenant ID:
${claims.tid ?? "N/A"}
`;
}

loginBtn.addEventListener("click", async () => {
    await msalInstance.loginRedirect(loginRequest);
});

initialize().catch(console.error);