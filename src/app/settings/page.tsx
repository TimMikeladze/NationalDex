import { SettingsClient } from "./client";

/**
 * Server shell for the settings page: it knows which sign-in providers are
 * configured (server-only env), and hands that to the client page.
 */
export default function SettingsPage() {
  return (
    <SettingsClient githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID)} />
  );
}
