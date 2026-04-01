import { authenticate } from "@google-cloud/local-auth";
import fs from "fs";
import path from "path";

const TOKEN_PATH = path.join(process.cwd(), "token.json");

export async function generateGoogleToken(): Promise<void> {
  const credPath = path.join(process.cwd(), "credentials.json");

  if (!fs.existsSync(credPath)) {
    throw new Error(
      `credentials.json not found in ${process.cwd()}.\n` +
        "  Download it from Google Cloud Console and place it in your project root."
    );
  }

  const auth = await authenticate({
    keyfilePath: credPath,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(auth.credentials, null, 2));
  console.log("token.json has been created successfully!");
}

// Allow direct execution: node dist/utils/localAuth.js
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("utils/localAuth.js");

if (isMain) {
  generateGoogleToken().catch(console.error);
}
