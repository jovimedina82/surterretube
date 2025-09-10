// /opt/surterretube/chat/get-token.js

import 'dotenv/config'; // This automatically loads from .env
import { DefaultAzureCredential } from "@azure/identity";

async function getToken() {
  const credential = new DefaultAzureCredential({
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  });

  const token = await credential.getToken("api://066b9a7c-6c9e-4005-8cf6-256fbe497ae9/.default");
  console.log(token.token);
}

getToken().catch((error) => {
  console.error("Error getting token:", error);
});