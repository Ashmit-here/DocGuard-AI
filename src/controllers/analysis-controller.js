import { getProjectReference } from '../services/project-reference-service.js';
import { analyzeWithOllama } from '../services/ollama-analyser-service.js';
import { prepareProjectSuggestions } from '../services/analyser-response-validator.js';
import { HttpError } from '../utils/http-error.js';
import { sendJson } from '../utils/http-response.js';

export async function analyzeProject(request, response, projectId, {
  loadProject = getProjectReference,
  runAnalysis = analyzeWithOllama,
} = {}) {
  request.resume();
  const project = loadProject(projectId);
  const result = await runAnalysis(project);
  if (typeof result?.analysis?.summary !== 'string' || !Array.isArray(result.analysis.findings)) {
    throw new HttpError(502, 'INVALID_ANALYSER_OUTPUT', 'The analyser returned a response that does not match the required result format.');
  }
  sendJson(response, 200, {
    projectId,
    analysis: prepareProjectSuggestions(result.analysis, project),
  });
}
