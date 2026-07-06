import React from 'react';

export default function TopBar({ text }) {
    if (!text) return null;

    return (
        <div className="w-full bg-zinc-900 text-white text-center text-[0.82rem] uppercase tracking-[0.12em]" aria-hidden>
            <div className="mx-auto max-w-[1920px] px-4 py-2 sm:px-6 lg:px-10">{String(text)}</div>
        </div>
    );
}
