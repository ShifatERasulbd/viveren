import React from 'react';

const FabricInnovations = () => {
  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      {/* Section Header */}
      <div className="text-center mb-16">
        <p className="text-[#d98d6e] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
          Our Materials
        </p>
        <h2 className="font-serif text-4xl md:text-5xl text-[#2b2724]">
          Signature Fabric Innovations
        </h2>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        
        {/* Left: Text Content */}
        <div className="w-full lg:w-1/2 text-[#2b2724]">
          <h3 className="font-serif text-3xl mb-2">FlexTwill</h3>
          <p className="text-[#d98d6e] text-xs font-bold tracking-[0.1em] uppercase mb-6">
            Structured. Supple. Everyday-Ready.
          </p>
          <p className="leading-relaxed opacity-90 mb-6">
            A compact knit with a refined twill surface. Crisp in appearance 
            yet soft to the touch, FlexTwill delivers polish without stiffness — 
            ideal for all-day, everyday wear.
          </p>
          <p className="text-[#d98d6e] font-semibold text-sm">
            Recycled Poly | Viscose-bamboo | Spandex
          </p>
        </div>

        {/* Right: Image */}
        <div className="w-full lg:w-1/2">
          <img 
            src="/path-to-your-swatch-image.jpg" 
            alt="FlexTwill fabric swatches in various colors" 
            className="w-full h-auto object-cover rounded-sm shadow-sm"
          />
        </div>
      </div>
    </section>
  );
};

export default FabricInnovations;