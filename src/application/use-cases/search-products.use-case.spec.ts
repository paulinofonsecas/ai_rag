import { HybridSearchOrchestrator } from 'src/application/services/hybrid-search.orchestrator';

import { SearchProductsUseCase } from './search-products.use-case';

describe('SearchProductsUseCase', () => {
  it('applies defaults and per-method top-k', async () => {
    const orchestrator: jest.Mocked<HybridSearchOrchestrator> = {
      search: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<HybridSearchOrchestrator>;

    const useCase = new SearchProductsUseCase(orchestrator);

    await useCase.execute({ query: 'headphones' });

    expect(orchestrator.search).toHaveBeenCalledWith({
      query: 'headphones',
      limit: 10,
      offset: 0,
      rrfK: 60,
      perMethodLimit: 25,
    });
  });
});
