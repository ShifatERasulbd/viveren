import React from 'react';
import TextGenerateEffect from './TextGenerateEffect';

export default function TopBar({ text, animate = false }) {
    if (!text) return null;

    const content = animate ? <TextGenerateEffect text={String(text)} /> : String(text);
    const topBarFontStyle = { fontFamily: 'Aeonik, "Aeonik Pro", "Aeonik TRIAL", sans-serif' };

    return (
        <div className="w-full bg-zinc-900 text-white text-center text-[0.82rem] uppercase tracking-[0.12em]" style={topBarFontStyle} aria-hidden>
            <div className="mx-auto max-w-[1920px] px-4 py-2 sm:px-6 lg:px-10">{content}</div>
        </div>
    );
}
