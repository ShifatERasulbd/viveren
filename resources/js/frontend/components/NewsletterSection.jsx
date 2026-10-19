import { ArrowRight } from 'lucide-react';

import { timelessFontClass } from '../utils/typography';
import { sectionTypography } from '../utils/sectionTypography';

export default function NewsletterSection({ sectionData }) {
    return (
        <section className={`${timelessFontClass} w-full`}>
            <div className="w-full">
                <h2 className={`${sectionTypography.footerHeading} text-white`}>
                    Join the house
                </h2>

                <p className={`${sectionTypography.footerLink} mt-4 text-zinc-400`}>
                    Be the first to discover what’s new.
                </p>

                <form
                    className="mt-5 flex items-stretch"
                    onSubmit={(e) => e.preventDefault()}
                >
                    <label htmlFor="newsletter-email" className="sr-only">
                        Email address
                    </label>
                    <input
                        id="newsletter-email"
                        type="email"
                        placeholder="Email address"
                        required
                        className="h-10 min-w-0 flex-1 border-b border-zinc-600 bg-transparent px-1 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-white"
                    />
                    <button
                        type="submit"
                        aria-label="Subscribe"
                        className="flex size-10 flex-none items-center justify-center bg-zinc-800 text-white transition-colors hover:bg-zinc-700"
                    >
                        <ArrowRight className="size-4" strokeWidth={2} />
                    </button>
                </form>
            </div>
        </section>
    );
}
