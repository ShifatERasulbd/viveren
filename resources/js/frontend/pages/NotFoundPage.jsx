import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <section className="frontend-unified-font flex min-h-[70vh] flex-col items-center justify-center px-5 py-16 text-center sm:px-8 lg:px-12">
            <p className="text-[3.5rem] font-semibold leading-none tracking-[0.05em] text-zinc-900 sm:text-[5rem]">
                404
            </p>
            <h1 className="mt-4 text-[1.5rem] font-semibold uppercase tracking-[0.05em] text-zinc-900 sm:text-[1.75rem]">
                Page Not Found
            </h1>
            <p className="mt-3 max-w-md text-sm text-zinc-500">
                The page you're looking for doesn't exist or may have been moved.
            </p>
            <Link
                to="/home"
                className="mt-8 inline-flex items-center justify-center bg-zinc-950 px-6 py-3 text-[0.75rem] font-medium uppercase tracking-[0.14em] text-white transition-colors hover:bg-zinc-800"
            >
                Back to Home
            </Link>
        </section>
    );
}
