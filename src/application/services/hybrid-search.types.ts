// Define the input type for HybridSearchOrchestrator here to avoid circular dependency
export interface SearchOrchestratorInput {
	query: string;
	limit: number;
	offset?: number;
	perMethodLimit?: number;
	rerank?: boolean;
	rerankCandidates?: number;
	rrfK?: number;
}
