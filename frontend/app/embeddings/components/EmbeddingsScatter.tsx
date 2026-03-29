import { useEffect, useMemo, useRef, useState } from 'react';

import { EmbeddingItem, PcaPoint } from '../types';

type EmbeddingsScatterProps = {
    loading: boolean;
    filteredItems: EmbeddingItem[];
    coordinates: PcaPoint[];
    selectedIndex: number | null;
    onSelectIndex: (index: number) => void;
    categoryColor: Map<string, string>;
};

const VIEWBOX_WIDTH = 900;
const VIEWBOX_HEIGHT = 560;
const MIN_SCALE = 1;
const MAX_SCALE = 6;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function shortText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 1)}…`;
}

export function EmbeddingsScatter({
    loading,
    filteredItems,
    coordinates,
    selectedIndex,
    onSelectIndex,
    categoryColor,
}: EmbeddingsScatterProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const dragRef = useRef<{ clientX: number; clientY: number; pointerId: number } | null>(null);
    const pinchingRef = useRef<{
        distance: number;
        centerX: number;
        centerY: number;
        scale: number;
        tx: number;
        ty: number;
    } | null>(null);
    const suppressClickRef = useRef(false);
    const mapHeightClass = isFullscreen ? 'h-screen' : 'h-[560px]';

    function toggleFullscreen() {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        if (document.fullscreenElement) {
            void document.exitFullscreen();
            return;
        }

        void container.requestFullscreen();
    }

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        };
    }, []);

    function toViewBox(clientX: number, clientY: number) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) {
            return null;
        }

        const x = ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
        const y = ((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;
        return { x, y };
    }

    function zoomAt(clientX: number, clientY: number, nextScaleInput: number) {
        const pointer = toViewBox(clientX, clientY);
        if (!pointer) {
            return;
        }

        setTransform((previous) => {
            const nextScale = clamp(nextScaleInput, MIN_SCALE, MAX_SCALE);
            if (nextScale === previous.scale) {
                return previous;
            }

            const worldX = (pointer.x - previous.tx) / previous.scale;
            const worldY = (pointer.y - previous.ty) / previous.scale;

            return {
                scale: nextScale,
                tx: pointer.x - worldX * nextScale,
                ty: pointer.y - worldY * nextScale,
            };
        });
    }

    const selectedPoint = useMemo(() => {
        if (selectedIndex === null) {
            return null;
        }

        const point = coordinates[selectedIndex];
        const item = filteredItems[selectedIndex];

        if (!point || !item) {
            return null;
        }

        const cx = 20 + point.x * 860;
        const cy = 20 + (1 - point.y) * 520;
        const panelWidth = 320;
        const panelHeight = 138;
        const anchorX = transform.tx + transform.scale * cx;
        const anchorY = transform.ty + transform.scale * cy;
        const left = clamp(anchorX - panelWidth / 2, 8, VIEWBOX_WIDTH - panelWidth - 8);
        const top = clamp(anchorY - panelHeight - 14, 8, VIEWBOX_HEIGHT - panelHeight - 8);

        return {
            item,
            left,
            top,
            cx,
            cy,
            panelWidth,
            panelHeight,
            anchorX,
            anchorY,
            leftPercent: (left / VIEWBOX_WIDTH) * 100,
            topPercent: (top / VIEWBOX_HEIGHT) * 100,
        };
    }, [coordinates, filteredItems, selectedIndex, transform.scale, transform.tx, transform.ty]);

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl border border-border bg-muted/20"
        >
            {!loading && filteredItems.length > 0 ? (
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm transition hover:bg-card"
                >
                    <FullscreenIcon />
                    {isFullscreen ? 'Sair tela cheia' : 'Tela cheia'}
                </button>
            ) : null}

            {loading ? (
                <div className={`grid ${mapHeightClass} place-items-center text-sm text-muted-foreground`}>Carregando embeddings...</div>
            ) : filteredItems.length === 0 ? (
                <div className={`grid ${mapHeightClass} place-items-center text-sm text-muted-foreground`}>Sem pontos para exibir.</div>
            ) : (
                <>
                    <svg
                        ref={svgRef}
                        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                        className={`${mapHeightClass} w-full select-none`}
                        style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
                        onWheel={(event) => {
                            event.preventDefault();
                            const zoomDirection = event.deltaY > 0 ? -1 : 1;
                            const factor = zoomDirection > 0 ? 1.12 : 0.9;
                            zoomAt(event.clientX, event.clientY, transform.scale * factor);
                        }}
                        onPointerDown={(event) => {
                            if (event.button !== 0) {
                                return;
                            }

                            dragRef.current = {
                                clientX: event.clientX,
                                clientY: event.clientY,
                                pointerId: event.pointerId,
                            };
                            suppressClickRef.current = false;
                            setIsPanning(true);
                            event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onPointerMove={(event) => {
                            const drag = dragRef.current;
                            if (!drag || drag.pointerId !== event.pointerId) {
                                return;
                            }

                            const rect = svgRef.current?.getBoundingClientRect();
                            if (!rect) {
                                return;
                            }

                            const dx = ((event.clientX - drag.clientX) / rect.width) * VIEWBOX_WIDTH;
                            const dy = ((event.clientY - drag.clientY) / rect.height) * VIEWBOX_HEIGHT;

                            if (Math.abs(dx) > 0.6 || Math.abs(dy) > 0.6) {
                                suppressClickRef.current = true;
                            }

                            setTransform((previous) => ({
                                ...previous,
                                tx: previous.tx + dx,
                                ty: previous.ty + dy,
                            }));

                            dragRef.current = {
                                ...drag,
                                clientX: event.clientX,
                                clientY: event.clientY,
                            };
                        }}
                        onPointerUp={(event) => {
                            if (dragRef.current?.pointerId !== event.pointerId) {
                                return;
                            }

                            dragRef.current = null;
                            setIsPanning(false);
                            event.currentTarget.releasePointerCapture(event.pointerId);
                            setTimeout(() => {
                                suppressClickRef.current = false;
                            }, 0);
                        }}
                        onPointerCancel={() => {
                            dragRef.current = null;
                            setIsPanning(false);
                            suppressClickRef.current = false;
                        }}
                        onTouchStart={(event) => {
                            if (event.touches.length !== 2) {
                                pinchingRef.current = null;
                                return;
                            }

                            const first = event.touches.item(0);
                            const second = event.touches.item(1);
                            if (!first || !second) {
                                pinchingRef.current = null;
                                return;
                            }
                            const dx = second.clientX - first.clientX;
                            const dy = second.clientY - first.clientY;
                            pinchingRef.current = {
                                distance: Math.hypot(dx, dy),
                                centerX: (first.clientX + second.clientX) / 2,
                                centerY: (first.clientY + second.clientY) / 2,
                                scale: transform.scale,
                                tx: transform.tx,
                                ty: transform.ty,
                            };
                        }}
                        onTouchMove={(event) => {
                            if (event.touches.length !== 2 || !pinchingRef.current) {
                                return;
                            }

                            event.preventDefault();

                            const first = event.touches.item(0);
                            const second = event.touches.item(1);
                            if (!first || !second) {
                                return;
                            }
                            const dx = second.clientX - first.clientX;
                            const dy = second.clientY - first.clientY;
                            const distance = Math.hypot(dx, dy);
                            const currentCenterX = (first.clientX + second.clientX) / 2;
                            const currentCenterY = (first.clientY + second.clientY) / 2;

                            const pinch = pinchingRef.current;
                            const nextScale = clamp((distance / pinch.distance) * pinch.scale, MIN_SCALE, MAX_SCALE);

                            const pointer = toViewBox(currentCenterX, currentCenterY);
                            if (!pointer) {
                                return;
                            }

                            const worldX = (pointer.x - pinch.tx) / pinch.scale;
                            const worldY = (pointer.y - pinch.ty) / pinch.scale;

                            setTransform({
                                scale: nextScale,
                                tx: pointer.x - worldX * nextScale,
                                ty: pointer.y - worldY * nextScale,
                            });
                        }}
                        onTouchEnd={() => {
                            pinchingRef.current = null;
                        }}
                    >
                        <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}>
                            <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="#f8fafc" />
                            {coordinates.map((point, index) => {
                                const item = filteredItems[index];
                                const cx = 20 + point.x * 860;
                                const cy = 20 + (1 - point.y) * 520;
                                const color = categoryColor.get(item.category) ?? '#0f766e';
                                const isSelected = selectedIndex === index;
                                const isHovered = hoveredIndex === index;

                                return (
                                    <g key={item.id}>
                                        {isSelected ? (
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={10}
                                                fill="#ffffff"
                                                fillOpacity={0.9}
                                                stroke="#0f172a"
                                                strokeWidth={1.4}
                                                pointerEvents="none"
                                            />
                                        ) : null}
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={isSelected ? 6 : isHovered ? 5 : 3}
                                            fill={color}
                                            fillOpacity={isSelected ? 1 : isHovered ? 0.95 : 0.75}
                                            stroke={isSelected || isHovered ? '#0f172a' : 'none'}
                                            strokeWidth={isSelected ? 1.8 : isHovered ? 1.2 : 0}
                                            className="cursor-pointer transition-all duration-150"
                                            style={{ outline: 'none' }}
                                            onPointerDown={(event) => {
                                                event.stopPropagation();
                                            }}
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                            }}
                                            onPointerUp={(event) => {
                                                event.stopPropagation();
                                            }}
                                            onMouseEnter={() => setHoveredIndex(index)}
                                            onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
                                            onFocus={() => setHoveredIndex(index)}
                                            onBlur={() => setHoveredIndex((current) => (current === index ? null : current))}
                                            onClick={() => {
                                                if (suppressClickRef.current) {
                                                    return;
                                                }
                                                onSelectIndex(index);
                                            }}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    onSelectIndex(index);
                                                }
                                            }}
                                            tabIndex={0}
                                        />
                                    </g>
                                );
                            })}
                        </g>
                    </svg>

                    {selectedPoint ? (
                        <div className="pointer-events-none absolute inset-0 z-20">
                            <div
                                className="absolute w-[320px] max-w-[calc(100%-16px)] rounded-xl border border-border bg-card/95 p-3 shadow-lg"
                                style={{
                                    left: `calc(${selectedPoint.leftPercent}% - 0px)`,
                                    top: `calc(${selectedPoint.topPercent}% - 0px)`,
                                }}
                            >
                                <p className="text-sm font-semibold text-foreground">
                                    {shortText(selectedPoint.item.name.toUpperCase(), 44)}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {shortText(selectedPoint.item.category.toUpperCase(), 32)}
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                    {shortText(selectedPoint.item.description, 120)}
                                </p>
                                <p className="mt-2 break-all text-[10px] text-muted-foreground">
                                    ID: {selectedPoint.item.id}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}

function FullscreenIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-muted-foreground">
            <path d="M1.5 4V1.5H4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 1.5H10.5V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.5 8V10.5H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 10.5H1.5V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
