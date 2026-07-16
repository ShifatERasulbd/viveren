import React from 'react';

const MindfulMaterials = () => {
  const materials = [
    { name: "Modal", description: "for exceptional softness, breathability, and durability" },
    { name: "BCI Cotton", description: "to support improved farming practices and responsible water use" },
    { name: "Recycled & Compostable Polyester", description: "to reduce reliance on virgin resources" },
    { name: "Bamboo-derived Viscose", description: "for its renewable origins and natural softness" }
  ];

  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12">
        
        {/* Left: Image */}
        <div className="w-full lg:w-1/2">
          <img 
            src="/path-to-your-image.jpg" 
            alt="Various fabric textures with cotton and recycle icon" 
            className="w-full h-auto object-cover rounded-sm"
          />
        </div>

        {/* Right: Content */}
        <div className="w-full lg:w-1/2 text-[#2b2724]">
          <p className="text-[#d98d6e] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            Mindful Materials
          </p>
          <h2 className="font-serif text-4xl mb-6">Thoughtfully Chosen Materials</h2>
          <p className="mb-6 leading-relaxed opacity-90">
            Our fabrics are selected with equal care for comfort on the body and 
            respect for the planet. We prioritize materials with lower environmental 
            impact while continually exploring better alternatives as innovation evolves.
          </p>

          <h3 className="font-medium mb-4">We work with:</h3>
          <ul className="space-y-4 mb-8">
            {materials.map((item, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <p>
                  <strong className="font-semibold">{item.name}</strong> {item.description}
                </p>
              </li>
            ))}
          </ul>

          <p className="italic opacity-80 text-sm">
            Each Viveren fabric is engineered for longevity, purposeful 
            performance, and modern, earth-minded living.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MindfulMaterials;