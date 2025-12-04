import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

const VITE_API_URL = import.meta.env.VITE_API_URL;

const ROW_HEIGHT = 48; // Each item height
const VISIBLE_ROWS = 6; // Visible rows without scrolling
const BUFFER = 4; // Extra rows above/below for smoothness

// Local cache (no refetch if typed again)
const localCache = {};

export default function ICD11Search({ onSelect }) {
    const { token } = useAuth();
    const [query, setQuery] = useState("");
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    // Scroll container reference
    const listRef = useRef(null);

    // Debounce input 200ms
    const [debouncedQuery, setDebouncedQuery] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 200);
        return () => clearTimeout(t);
    }, [query]);

    // React Query + local memory cache
    const { data: results = [], isFetching } = useQuery({
        queryKey: ["icd-search", debouncedQuery],
        queryFn: async () => {
            if (debouncedQuery.length < 2) return [];

            if (localCache[debouncedQuery]) {
                return localCache[debouncedQuery];
            }

            const res = await fetch(
                `${VITE_API_URL}/icd/search?q=${debouncedQuery}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) return [];

            const data = await res.json();
            localCache[debouncedQuery] = data;
            return data;
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 1000 * 60 * 5, // 5 min cache
    });

    // Virtualization calculations
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = results.length * ROW_HEIGHT;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    const endIndex = Math.min(
        results.length,
        startIndex + VISIBLE_ROWS + BUFFER * 2
    );
    const visibleItems = results.slice(startIndex, endIndex);

    const handleScroll = () => {
        if (listRef.current) {
            setScrollTop(listRef.current.scrollTop);
        }
    };

    const handleSelect = (item) => {
        onSelect?.({ code: item.code, description: item.title });
        setQuery("");
        setShowDropdown(false);
        setHighlightIndex(0);
    };

    // Keyboard Navigation
    const handleKeyDown = (e) => {
        if (!showDropdown || results.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) =>
                Math.min(prev + 1, results.length - 1)
            );

            // Auto-scroll
            const nextOffset = (highlightIndex + 1) * ROW_HEIGHT;
            if (nextOffset > scrollTop + VISIBLE_ROWS * ROW_HEIGHT) {
                listRef.current.scrollTop += ROW_HEIGHT;
            }
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));

            const prevOffset = (highlightIndex - 1) * ROW_HEIGHT;
            if (prevOffset < scrollTop) {
                listRef.current.scrollTop -= ROW_HEIGHT;
            }
        }

        if (e.key === "Enter") {
            e.preventDefault();
            handleSelect(results[highlightIndex]);
        }
    };

    // Reset cursor when results update
    useEffect(() => {
        setHighlightIndex(0);
    }, [results]);

    return (
        <div className="relative w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
                Add Provisional Diagnosis (ICD-11)
            </label>

            <div className="relative">
                <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                    placeholder="Type to search..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowDropdown(true);
                    }}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />

                {/* Loading Spinner */}
                {isFetching && (
                    <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
                <div
                    ref={listRef}
                    onScroll={handleScroll}
                    className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-xl mt-1 overflow-y-auto"
                    style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}
                >
                    {/* Invisible spacer */}
                    <div style={{ height: totalHeight, position: "relative" }}>
                        {/* Render only visible rows */}
                        <div
                            style={{
                                position: "absolute",
                                top: startIndex * ROW_HEIGHT,
                                left: 0,
                                right: 0,
                            }}
                        >
                            {visibleItems.map((item, i) => {
                                const absoluteIndex = startIndex + i;
                                return (
                                    <div
                                        key={absoluteIndex}
                                        className={`p-2 border-b border-gray-50 cursor-pointer transition-colors
                                            ${
                                                absoluteIndex ===
                                                highlightIndex
                                                    ? "bg-indigo-100"
                                                    : "hover:bg-indigo-50"
                                            }`}
                                        onClick={() => handleSelect(item)}
                                        style={{
                                            height: ROW_HEIGHT,
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span className="text-sm font-medium text-gray-800">
                                            {item.title}
                                        </span>
                                        {item.code && (
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-mono">
                                                {item.code}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
