import { notebookSessionManager } from '../agents/NotebookSessionManager';
import { UnifiedLLMService } from '../UnifiedLLMService';

/**
 * Notebook Search Tool: Performs RAG search restricted to the active NotebookSession context.
 */
export class NotebookSearchTool {
  static async search(
    sessionId: string,
    query: string,
    providerId: string,
    apiKey?: string
  ): Promise<string> {
    const session = notebookSessionManager.get(sessionId);
    if (!session) {
      return `Error: Notebook session ${sessionId} not found.`;
    }

    // Retrieve summary context from the notebook
    const notebookSummary = await session.getSummary();
    
    // Perform RAG search using the session's context as the source
    const prompt = `
      You are an expert retrieval assistant. Use the following notebook context to answer the question.
      If the information is not in the context, say "I cannot find this in the current notebook."
      
      Notebook Context:
      ${notebookSummary}
      
      Question:
      ${query}
    `;

    const { unifiedLLMService } = await import('../UnifiedLLMService');
    const response = await unifiedLLMService.chat(providerId, [{ role: 'user', content: prompt }], {
      apiKey
    });

    return response.content || 'I could not find an answer.';
  }
}
