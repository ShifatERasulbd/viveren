import { Link } from 'react-router-dom';
import { timelessFontClass } from '../utils/typography';

// Static data structure to match the layout of image_8fa16d.jpg
const CONTENT_ITEMS = [
    { id: 1, title: 'Purpose Built Fabric Innovation', desc: 'A partnership built on quiet confidence.', link: '/shop' },
    { id: 2, title: 'Purpose Built Fabric Innovation', desc: 'Find a Viveren store near you.', link: '/stores' },
    { id: 3, title: 'Purpose Built Fabric Innovation', desc: 'This summer, we return to where it began.', link: '/story' },
];

export default function FeaturedSection() {
    return (
        <section className={`${timelessFontClass} bg-[#f5f2ed] py-16`}>
            <div className="mx-auto w-full max-w-[1400px] px-6">
                {/* 3-Column Grid Layout matching image_8fa16d.jpg */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {CONTENT_ITEMS.map((item) => (
                        <div key={item.id} className="flex flex-col">
                            {/* Image Placeholder - Replace with your static assets */}
                            <div className="aspect-[4/5] w-full overflow-hidden bg-zinc-200">
                                <img
                                    src={`/uploads/hero${item.id}.webp`}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            {/* Text Content matching typography style in image_8fa16d.jpg */}
                            <div className="mt-6">
                                <h3 className="text-xl font-light text-zinc-900">
                                    {item.title}
                                </h3>
                                <p className="mt-2 text-sm text-zinc-600">
                                    {item.desc}
                                </p>
                                
                                {/* CTA Link matching style in image_8fa16d.jpg */}
                                <Link
                                    to={item.link}
                                    className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-zinc-900 underline decoration-1 underline-offset-4 hover:opacity-70"
                                >
                                    {item.id === 2 ? 'EXPLORE STORES' : item.id === 3 ? 'READ MORE' : 'LEARN MORE'}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}