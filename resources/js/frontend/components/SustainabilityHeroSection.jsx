import { useEffect, useState } from 'react';

export default function SustainabilityHeroSection() {
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;

        fetch('/api/public/sustainability-hero', {
            credentials: 'include',
            headers: {
                Accept: 'application/json',
            },
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to load sustainability hero');
                }
                return res.json();
            })
            .then((json) => {
                if (!cancelled) {
                    setData(json);
                }
            })
            .catch(() => {
                // keep fallback
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const label = data?.label ?? 'Our Responsibility';
    const title = data?.title ?? 'Sustainability & Responsibility';
    const subtitle = data?.subtitle ?? 'How We Think, Design, and Build with Care';

    return (
        <section className="bg-[#2b2724] py-20 px-6 text-center text-white">
            <div className="max-w-4xl mx-auto">
                <p className="text-xs uppercase tracking-[0.2em] opacity-80 mb-4">{label}</p>

                <h1 className="font-serif text-4xl md:text-6xl font-light mb-6">{title}</h1>

                <p className="font-serif text-lg md:text-xl opacity-90">{subtitle}</p>
            </div>
        </section>
    );
}

