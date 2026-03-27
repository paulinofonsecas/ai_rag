import { EmbeddingItem, PcaPoint } from '../types';

type EmbeddingsScatterProps = {
    loading: boolean;
    filteredItems: EmbeddingItem[];
    coordinates: PcaPoint[];
    selectedIndex: number | null;
    onSelectIndex: (index: number) => void;
    categoryColor: Map<string, string>;
};

export function EmbeddingsScatter({
    loading,
    filteredItems,
    coordinates,
    selectedIndex,
    onSelectIndex,
    categoryColor,
}: EmbeddingsScatterProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
                <div className="grid h-[560px] place-items-center text-sm text-slate-500">Carregando embeddings...</div>
            ) : filteredItems.length === 0 ? (
                <div className="grid h-[560px] place-items-center text-sm text-slate-500">Sem pontos para exibir.</div>
            ) : (
                <svg viewBox="0 0 900 560" className="h-[560px] w-full">
                    <rect x="0" y="0" width="900" height="560" fill="#f8fafc" />
                    {coordinates.map((point, index) => {
                        const item = filteredItems[index];
                        const cx = 20 + point.x * 860;
                        const cy = 20 + (1 - point.y) * 520;
                        const color = categoryColor.get(item.category) ?? '#0f766e';
                        const isSelected = selectedIndex === index;

                        return (
                            <circle
                                key={item.id}
                                cx={cx}
                                cy={cy}
                                r={isSelected ? 5 : 3}
                                fill={color}
                                fillOpacity={isSelected ? 1 : 0.75}
                                stroke={isSelected ? '#0f172a' : 'none'}
                                strokeWidth={isSelected ? 1.5 : 0}
                                onClick={() => onSelectIndex(index)}
                            />
                        );
                    })}
                </svg>
            )}
        </div>
    );
}
