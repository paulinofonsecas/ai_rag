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
        <div className="mb-3 flex flex-wrap items-center gap-3">
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
    );
}
