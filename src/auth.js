import { PublicClientApplication } from "https://esm.sh/@azure/msal-browser";

const msalConfig = {
    auth: {
        clientId: "2b7a3439-67d5-4cb0-b8d1-a244078196e3",
        authority: "https://login.microsoftonline.com/common",
        // Must exactly match a redirect URI registered in Entra (localhost included).
        redirectUri: window.location.origin + window.location.pathname
    }
};

export const msalInstance = new PublicClientApplication(msalConfig);


await msalInstance.initialize();

export const loginRequest = {
    scopes: [
        "openid",
        "profile",
        "email"
    ]
};
