import { useState } from "react";
import { Search } from "lucide-react";

import SeverityTag from "../components/SeverityTag";
import { useWorkflow } from "../workflow-context";

import "./DocumentationIssues.css";

function getPathReferences(references) {
  return Array.isArray(references)
    ? references.filter((reference) => reference && typeof reference.path === "string")
    : [];
}

const DocumentationIssues = () => {
  const { projects, pullRequests } = useWorkflow();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [view, setView] = useState(null);

  const findings = projects.flatMap((project) => (
    Array.isArray(project.analysis?.findings)
      ? project.analysis.findings.map((finding, index) => ({
        ...finding,
        id: `${project.projectId}-${index}`,
        repository: project.repositoryName ?? project.source?.repositoryUrl ?? "Project",
        projectId: project.projectId
      }))
      : []
  )).concat(pullRequests.flatMap((item, requestIndex) => (
    Array.isArray(item.driftAnalysis?.findings)
      ? item.driftAnalysis.findings.map((finding, index) => ({
        ...finding,
        id: `pr-${requestIndex}-${finding.id ?? index}`,
        title: finding.title ?? finding.reason ?? "Verified documentation drift",
        explanation: finding.reason ?? finding.sentence ?? "A deterministic rule matched the documentation to a changed source value.",
        severity: finding.severity ?? "info",
        sourceReferences: finding.codeEvidence?.file
          ? [{ path: finding.codeEvidence.file, ...(Number.isSafeInteger(finding.codeEvidence.line) ? { startLine: finding.codeEvidence.line } : {}) }]
          : [],
        documentationReferences: finding.documentation?.file
          ? [{
            path: finding.documentation.file,
            ...(Number.isSafeInteger(finding.documentation.pageNumber) ? { pageNumber: finding.documentation.pageNumber } : {}),
            ...(typeof finding.documentation.sentence === "string" ? { quote: finding.documentation.sentence } : {})
          }]
          : [],
        repository: item.source?.repositoryUrl ?? "Pull request"
      }))
      : []
  )));
  const suggestions = projects.flatMap((project) => (
    Array.isArray(project.analysis?.suggestions)
      ? project.analysis.suggestions.map((suggestion, index) => ({
        ...suggestion,
        id: `${project.projectId}-suggestion-${index}`,
        repository: project.repositoryName ?? project.source?.repositoryUrl ?? "Project",
        projectId: project.projectId
      }))
      : []
  )).concat(pullRequests.flatMap((item, requestIndex) => (
    Array.isArray(item.driftAnalysis?.suggestions)
      ? item.driftAnalysis.suggestions.map((suggestion, index) => ({
        ...suggestion,
        id: `pr-suggestion-${requestIndex}-${suggestion.id ?? index}`,
        title: suggestion.title ?? suggestion.reason ?? "Unverified model suggestion",
        explanation: suggestion.reason ?? suggestion.sentence ?? "The model suggested a possible documentation mismatch.",
        severity: suggestion.severity ?? "info",
        sourceReferences: suggestion.codeEvidence?.file
          ? [{ path: suggestion.codeEvidence.file, ...(Number.isSafeInteger(suggestion.codeEvidence.line) ? { startLine: suggestion.codeEvidence.line } : {}) }]
          : [],
        documentationReferences: suggestion.documentation?.file
          ? [{
            path: suggestion.documentation.file,
            ...(Number.isSafeInteger(suggestion.documentation.pageNumber) ? { pageNumber: suggestion.documentation.pageNumber } : {}),
            ...(typeof suggestion.documentation.sentence === "string" ? { quote: suggestion.documentation.sentence } : {})
          }]
          : [],
        repository: item.source?.repositoryUrl ?? "Pull request"
      }))
      : []
  )));
  const activeView = view ?? (findings.length === 0 && suggestions.length > 0 ? "suggestions" : "findings");
  const entries = activeView === "suggestions" ? suggestions : findings;
  const query = search.toLowerCase();
  const visible = entries.filter((finding) => {
    const sourcePaths = getPathReferences(finding.sourceReferences).map((reference) => reference.path);
    const documentationPaths = getPathReferences(finding.documentationReferences).map((reference) => reference.path);
    const searchable = [
      finding.repository,
      finding.title,
      finding.explanation,
      finding.recommendation,
      ...sourcePaths,
      ...documentationPaths
    ].filter((value) => typeof value === "string").join(" ").toLowerCase();
    return searchable.includes(query)
      && (severity === "All" || String(finding.severity ?? "info").toLowerCase() === severity.toLowerCase());
  });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Verified documentation findings</h1>
          <p>Deterministic findings and model suggestions are kept separate.</p>
        </div>
      </header>

      <div className="results-toolbar" role="tablist" aria-label="Result verification type">
        <button
          role="tab"
          aria-selected={activeView === "findings"}
          className={`chip ${activeView === "findings" ? "on" : ""}`}
          onClick={() => setView("findings")}
        >
          Verified findings <span>{findings.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeView === "suggestions"}
          className={`chip ${activeView === "suggestions" ? "on" : ""}`}
          onClick={() => setView("suggestions")}
        >
          AI suggestions <span>{suggestions.length}</span>
        </button>
      </div>

      {activeView === "suggestions" && suggestions.length > 0 && (
        <p className="unverified-note" role="note">
          Model suggestions are unverified candidates. Matching file references do not prove the model’s interpretation.
        </p>
      )}

      <div className="issues-toolbar">
        <label className="input">
          <Search size={16} />
          <input
            placeholder={`Search repository, file or ${activeView === "suggestions" ? "suggestion" : "finding"}`}
            aria-label={`Search ${activeView === "suggestions" ? "suggestions" : "findings"}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Severity">
          <option value="All">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="info">Info</option>
        </select>
      </div>

      <p className="muted issues-count" role="status">
        {visible.length} {activeView === "suggestions"
          ? visible.length === 1 ? "suggestion" : "suggestions"
          : visible.length === 1 ? "finding" : "findings"}
      </p>

      {visible.length === 0 ? (
        <div className="empty">
          <strong>{entries.length
            ? `No ${activeView === "suggestions" ? "suggestions" : "findings"} match these filters`
            : activeView === "suggestions" ? "No AI suggestions are available" : "No verified findings are available"}</strong>
          {entries.length
            ? `Clear the search or choose “All severities” to see other ${activeView === "suggestions" ? "suggestions" : "findings"}.`
            : activeView === "suggestions"
              ? "Repository analysis suggestions appear here after a check completes."
              : "Verified pull request findings appear here after a pull request check completes."}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table issues-table">
            <thead>
              <tr>
                <th>Repository</th>
                <th>{activeView === "suggestions" ? "Suggestion" : "Finding"}</th>
                <th>Source references</th>
                <th>Documentation references</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((finding) => (
                <tr key={finding.id}>
                  <td>{finding.repository}</td>
                  <td>
                    <strong>{finding.title ?? `Untitled ${activeView === "suggestions" ? "suggestion" : "finding"}`}</strong>
                    {activeView === "suggestions" && <p className="muted">Unverified model suggestion</p>}
                    {typeof finding.explanation === "string" && <p>{finding.explanation}</p>}
                    {typeof finding.recommendation === "string" && finding.recommendation && (
                      <p className="muted"><strong>Recommendation:</strong> {finding.recommendation}</p>
                    )}
                  </td>
                  <td>
                    {getPathReferences(finding.sourceReferences).map((reference, index) => (
                      <div className="path" key={`${reference.path}-${index}`}>
                        {reference.path}
                        {Number.isSafeInteger(reference.startLine) ? `:${reference.startLine}` : ""}
                        {Number.isSafeInteger(reference.endLine) && reference.endLine !== reference.startLine
                          ? `-${reference.endLine}`
                          : ""}
                      </div>
                    ))}
                    {getPathReferences(finding.sourceReferences).length === 0 && "—"}
                  </td>
                  <td>
                    {getPathReferences(finding.documentationReferences).map((reference, index) => (
                      <div key={`${reference.path}-${index}`}>
                        <span className="path">{reference.path}</span>
                        {Number.isSafeInteger(reference.pageNumber) ? `, page ${reference.pageNumber}` : ""}
                        {typeof reference.quote === "string" && reference.quote && <blockquote>{reference.quote}</blockquote>}
                      </div>
                    ))}
                    {getPathReferences(finding.documentationReferences).length === 0 && "—"}
                  </td>
                  <td><SeverityTag severity={finding.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentationIssues;
