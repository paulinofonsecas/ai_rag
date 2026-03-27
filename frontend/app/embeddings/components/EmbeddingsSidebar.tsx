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
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-ink">Detalhes</h2>
            <p className="mt-1 text-sm text-slate-600">
                Total carregado: <span className="font-semibold text-slate-800">{allCount}</span>
            </p>
            <p className="text-sm text-slate-600">
                Pontos visiveis: <span className="font-semibold text-slate-800">{visibleCount}</span>
            </p>
            <p className="text-sm text-slate-600">
                Fonte: <span className="font-semibold text-slate-800">{dataSource === 'search' ? 'resultado da busca' : 'base completa (DB)'}</span>
            </p>

            <div className="mt-4 space-y-2">
                {categories.map((category) => (
                    <div key={category} className="flex items-center gap-2 text-xs text-slate-700">
                        <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: categoryColor.get(category) ?? '#0f766e' }}
                        />
                        <span className="truncate">{category}</span>
                    </div>
                ))}
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                {selectedItem ? (
                    <>
                        <p className="font-semibold text-ink">{selectedItem.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{selectedItem.category}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">{selectedItem.description}</p>
                        <p className="mt-2 break-all text-[11px] text-slate-500">ID: {selectedItem.id}</p>
                    </>
                ) : (
                    <p className="text-xs text-slate-500">Clique em um ponto para ver detalhes do produto.</p>
                )}
            </div>
        </aside>
    );
}
