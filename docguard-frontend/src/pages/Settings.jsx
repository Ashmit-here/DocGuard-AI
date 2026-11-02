import { API_BASE_URL } from "../services/api";
import { useWorkflow } from "../workflow-context";

import "./Settings.css";

const Settings = () => {
  const { backendStatus } = useWorkflow();

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div>
          <h1>Settings and service status</h1>
          <p>Configuration is managed by the backend environment and frontend build.</p>
        </div>
      </header>

      <section className="settings-section">
        <h2>Backend connection</h2>
        <div className="settings-row">
          <div>
            <strong>API status</strong>
            <p>{backendStatus.message || "Checking the backend health endpoint."}</p>
          </div>
          <span className={`status ${backendStatus.state === "connected" ? "connected" : "pending"}`}>
            {backendStatus.state === "connected"
              ? "Connected"
              : backendStatus.state === "unavailable"
                ? "Unavailable"
                : "Checking"}
          </span>
        </div>
        <div className="settings-row">
          <div>
            <strong>API base URL</strong>
            <p>The frontend sends requests to this backend API path.</p>
          </div>
          <code>{API_BASE_URL}</code>
        </div>
        <p className="settings-note">
          In development, <code>/api</code> is proxied to the backend on port 3000. For a separate production API, set <code>VITE_API_URL</code> at build time and allow the frontend origin with <code>CORS_ALLOWED_ORIGINS</code>.
        </p>
      </section>

      <section className="settings-section">
        <h2>Analysis behavior</h2>
        <ul className="settings-list">
          <li>Repository snapshots produce unverified AI suggestions because they do not include a before-and-after source change.</li>
          <li>Pull request checks can report deterministic findings from changed lines and show model suggestions separately.</li>
          <li>Results stay in this browser tab. Backend project references are temporary and expire after 15 minutes by default.</li>
        </ul>
      </section>

      <section className="settings-section">
        <h2>Backend configuration</h2>
        <p>
          Set <code>OLLAMA_BASE_URL</code> and the installed <code>OLLAMA_MODEL</code> on the backend. An optional <code>GITHUB_TOKEN</code> can raise GitHub API rate limits; keep it in a trusted backend environment and never put it in frontend settings.
        </p>
      </section>
    </div>
  );
};

export default Settings;
