import { defineConfig, devices } from "@playwright/test";
import { API_KEY, PRICES, PROJECT_ID, WEBHOOK_SECRET } from "./tests/e2e/support.mjs";

const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

const serverEnv = {
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_FIREBASE_API_KEY: API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:e2e",
  NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true",
  FIREBASE_ADMIN_PROJECT_ID: PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: "",
  FIREBASE_ADMIN_PRIVATE_KEY: "",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  STRIPE_PRICE_PREMIUM_MONTHLY: PRICES.premium,
  STRIPE_PRICE_PREMIUM_PLUS_YEARLY: PRICES["premium-plus"],
  STRIPE_ALLOW_LIVE_MODE: "false",
  APP_URL: "",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--disable-audio-output"] },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /responsive\.spec/,
    },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } },
      testMatch: /responsive\.spec/,
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: /responsive\.spec/,
    },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT} -H 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: serverEnv,
  },
});
