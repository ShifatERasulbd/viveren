import React from 'react';

const LongevitySection = () => {
  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Text Content */}
        <div className="md:w-1/2 space-y-6">
          <p className="text-[#d98d6e] text-xs font-semibold tracking-widest uppercase">
            Sustainability, Practiced Daily
          </p>
          <h2 className="font-serif text-4xl text-[#2b2724]">
            Designed for <i>Longevity</i>
          </h2>
          <div className="space-y-4 text-[#4a4643] leading-relaxed">
            <p>
              At Viveren, sustainability isn't a statement—it's a daily discipline. 
              It's built through thoughtful, consistent choices across design, 
              materials, and craftsmanship, always prioritizing longevity over volume 
              and progress over perfection.
            </p>
            <p>
              As we grow, we remain committed to transparency and continuous 
              improvement—exploring lower-impact materials, refining our processes, 
              and investing in responsible innovation. Because real change happens 
              quietly, consistently, and with intention.
            </p>
          </div>
        </div>

        {/* Image */}
        <div className="md:w-1/2 w-full">
          <img 
            src="/path-to-your-image.jpg" 
            alt="Model in cream dress" 
            className="w-full h-auto object-cover rounded-sm"
          />
        </div>
      </div>
    </section>
  );
};

export default LongevitySection;