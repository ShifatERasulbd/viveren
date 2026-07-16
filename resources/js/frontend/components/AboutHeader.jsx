export default function AboutHeader({ sectionTitle, heroTitle, description }) {
    return (
        <div className="mx-auto max-w-[760px] text-center">
            <p className="text-[0.58rem] uppercase tracking-[0.38em] text-zinc-500 sm:text-[0.62rem]">
                {sectionTitle || 'Our Story'}
            </p>
            <h1 className="mt-2 text-[2rem] font-medium leading-[1.05] text-zinc-800 sm:text-[2.65rem] lg:text-[3.1rem]">
                {heroTitle || 'A life lived in the sun.'}
            </h1>
            <p className="mx-auto mt-3 max-w-[640px] text-[0.78rem] leading-6 text-zinc-600 sm:text-[0.86rem] sm:leading-7 lg:text-[0.95rem]">
                {description}
            </p>
        </div>
    );
}