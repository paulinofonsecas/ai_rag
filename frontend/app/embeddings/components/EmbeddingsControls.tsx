type EmbeddingsControlsProps = {
    categories: string[];
    selectedCategory: string;
    onSelectedCategoryChange: (value: string) => void;
    sampleSize: number;
    onSampleSizeChange: (value: number) => void;
    currentCount: number;
};

export function EmbeddingsControls({
    categories,
    selectedCategory,
    onSelectedCategoryChange,
    sampleSize,
    onSampleSizeChange,
    currentCount,
}: EmbeddingsControlsProps) {
    return (
        <div className="mb-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    Categoria
                    <select
                        value={selectedCategory}
                        onChange={(event) => onSelectedCategoryChange(event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                        <option value="all">Todas</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                    Pontos
                    <input
                        type="range"
                        min={100}
                        max={3000}
                        step={100}
                        value={sampleSize}
                        onChange={(event) => onSampleSizeChange(Number(event.target.value))}
                    />
                    <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700">{currentCount}</span>
                </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
                <p className="mb-1 font-semibold text-slate-700">Como navegar no mapa</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="inline-flex items-center gap-1.5">
                        <MouseIcon />
                        Arraste no fundo para mover
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <ZoomIcon />
                        Scroll para zoom
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <TapIcon />
                        Clique no ponto para detalhes
                    </span>
                </div>
            </div>
        </div>
    );
}

function MouseIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-slate-500">
            <rect x="3.5" y="1.5" width="7" height="11" rx="3" stroke="currentColor" strokeWidth="1.2" />
            <line x1="7" y1="2.4" x2="7" y2="5.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
    );
}

function ZoomIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-slate-500">
            <circle cx="6" cy="6" r="3.6" stroke="currentColor" strokeWidth="1.2" />
            <line x1="8.8" y1="8.8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="6" y1="4.4" x2="6" y2="7.6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <line x1="4.4" y1="6" x2="7.6" y2="6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
    );
}

function TapIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-slate-500">
            <circle cx="7" cy="7" r="2.1" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="7" r="4.1" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5" />
        </svg>
    );
}
