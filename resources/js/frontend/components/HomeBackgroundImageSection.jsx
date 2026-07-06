import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { timelessFontClass } from '../utils/typography';

// Default mock data to mirror the 4-grid look
const DEFAULT_ITEMS = [
    { id: 1, name: 'TOP BOXY CROP', image: '/uploads/hero1.webp', url: '/shop' },
    { id: 2, name: 'TOP CREW NECK PULLOVER', image: '/uploads/hero2.webp', url: '/shop' },
    { id: 3, name: 'TOP CREW NECK PULLOVER', image: '/uploads/hero3.webp', url: '/shop' },
    { id: 4, name: 'TOP BOXY CROP', image: '/uploads/hero4.webp', url: '/shop' },
];

export default function HomeGridSection() {
    const [items, setItems] = useState(DEFAULT_ITEMS);

    return (
        <section className={`${timelessFontClass} w-full bg-white`}>
            {/* Grid container: 1 column on mobile, 2 columns on tablet/desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2">
                {items.map((item) => (
                    <Link 
                        key={item.id} 
                        to={item.url} 
                        className="group relative block aspect-square overflow-hidden bg-zinc-100"
                    >
                        {/* Background Image */}
                        <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        
                        {/* Overlay Text Content (Matches style in image_8f396c.jpg) */}
                        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
                            <div className="w-fit bg-black/20 p-6 backdrop-blur-sm">
                                <h3 className="text-xl font-bold uppercase tracking-widest text-white md:text-2xl">
                                    {item.name}
                                </h3>
                                <span className="mt-2 block text-sm font-semibold uppercase tracking-[0.2em] text-white/90 underline decoration-1 underline-offset-4">
                                    SHOP NOW
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}