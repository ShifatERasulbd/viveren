import { MapPin } from 'lucide-react';

import { featuresFontClass } from '../utils/typography';

const locationLabel = '14 Progress Road, Billerica, MA 01821, United States';
const mapEmbedUrl =
    'https://www.openstreetmap.org/export/embed.html?bbox=-71.2407%2C42.5181%2C-71.2293%2C42.5251&layer=mapnik&marker=42.5216%2C-71.2350';

export default function ContactLocationMapSection() {
    return (
        <section className={`${featuresFontClass} bg-white py-14 sm:py-18 lg:py-24`}>
            <div className="mx-auto w-full max-w-[1920px] px-0">
                <div className="relative isolate overflow-hidden border-y border-zinc-200 bg-zinc-100">
                    <iframe
                        title="Timeless location map"
                        src={mapEmbedUrl}
                        loading="lazy"
                        className="h-[340px] w-full grayscale-[0.08] sm:h-[420px] lg:h-[510px]"
                        referrerPolicy="no-referrer-when-downgrade"
                    />

                 

                    
                </div>
            </div>
        </section>
    );
}
