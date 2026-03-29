import { EmbeddingItem } from '../types';

type EmbeddingsSidebarProps = {
    allCount: number;
    visibleCount: number;
    dataSource: 'search' | 'db';
    categories: string[];
    categoryColor: Map<string, string>;
    selectedItem: EmbeddingItem | null;
};

export function EmbeddingsSidebar({
    allCount,
    visibleCount,
    dataSource,
    categories,
    categoryColor,
    selectedItem,
}: EmbeddingsSidebarProps) {
    return (
        <aside className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold text-foreground">Detalhes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Total carregado: <span className="font-semibold text-foreground">{allCount}</span>
            </p>
            <p className="text-sm text-muted-foreground">
                Pontos visiveis: <span className="font-semibold text-foreground">{visibleCount}</span>
            </p>
            <p className="text-sm text-muted-foreground">
                Fonte: <span className="font-semibold text-foreground">{dataSource === 'search' ? 'resultado da busca' : 'base completa (DB)'}</span>
            </p>

            <div className="mt-4 space-y-2">
                {categories.map((category) => (
                    <div key={category} className="flex items-center gap-2 text-xs text-foreground">
                        <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: categoryColor.get(category) ?? '#0f766e' }}
                        />
                        <span className="truncate">{category}</span>
                    </div>
                ))}
            </div>

            <div className="mt-5 rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">
                <p className="text-xs text-muted-foreground">Clique em um ponto para ver detalhes do produto.</p>
            </div>
        </aside>
    );
}
