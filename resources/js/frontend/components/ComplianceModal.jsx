import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function ComplianceModal({ isOpen, onClose, title, content }) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function handleEscape(event) {
            if (event.key === 'Escape') {
                onClose?.();
            }
        }

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/55 p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Compliance information'}
        >
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close modal"
                onClick={onClose}
                className="absolute inset-0 cursor-default"
            />

            {/* Modal panel */}
            <div className="relative z-[1501] flex max-h-[85vh] w-full max-w-[720px] flex-col bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                    <h2 className="font-monstrate text-[1.1rem] font-semibold uppercase tracking-[0.08em] text-zinc-900 sm:text-[1.25rem]">
                        {title || ''}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-500 transition-colors hover:text-zinc-900"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto px-6 py-6">
                    {content ? (
                        <div
                            className="prose prose-sm max-w-none font-monstrate text-zinc-700 prose-headings:text-zinc-900 prose-a:text-zinc-900 prose-strong:text-zinc-900"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    ) : (
                        <p className="font-monstrate text-zinc-500">No content available.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

