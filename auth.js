const msalConfig = {
    auth: {
        clientId: "2b7a3439-67d5-4cb0-b8d1-a244078196e3",
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

console.log("MSAL initialized.");