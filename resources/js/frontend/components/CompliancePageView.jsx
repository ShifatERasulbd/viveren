import { useEffect, useState } from 'react';

export default function CompliancePageView({ title, field }) {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        async function fetchCompliance() {
            try {
                const response = await fetch('/api/public/compliance', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!ignore) {
                    setContent(payload?.[field] || '');
                }
            } catch {
                // ignore fetch failures, fall back to empty content
            } finally {
                if (!ignore) {
                    setIsLoading(false);
                }
            }
        }

        fetchCompliance();
        return () => {
            ignore = true;
        };
    }, [field]);

    return (
        <section className="frontend-unified-font px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
            <div className="mx-auto w-full max-w-[860px]">
                <h1 className="mb-8 text-[1.75rem] font-semibold uppercase tracking-[0.05em] text-zinc-900 sm:text-[2rem]">
                    {title}
                </h1>

                {isLoading ? (
                    <p className="text-sm text-zinc-500">Loading...</p>
                ) : content ? (
                    <div
                        className="prose prose-sm max-w-none font-monstrate text-zinc-700 prose-headings:text-zinc-900 prose-a:text-zinc-900 prose-strong:text-zinc-900"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                ) : (
                    <p className="text-sm text-zinc-500">No content available.</p>
                )}
            </div>
        </section>
    );
}
