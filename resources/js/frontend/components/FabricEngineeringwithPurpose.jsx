import React from 'react';

const FabricEngineeringwithPurpose = () => {
  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        
        {/* Left: Text Content */}
        <div className="w-full lg:w-1/2 text-[#2b2724]">
          <p className="text-[#d98d6e] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            Fabric & Technology
          </p>
          <h2 className="font-serif text-4xl mb-6">
            Fabric, Engineered with Purpose
          </h2>
          <div className="space-y-6 text-[#4a4643] leading-relaxed mb-6">
            <p>
              As owners of our manufacturing facility, we maintain direct oversight 
              of how our garments are made.
            </p>
            <p>
              This allows us to uphold ethical labor practices, ensure safe and 
              respectful working conditions, maintain consistent quality, and reduce 
              unnecessary supply-chain complexity. Our factory operates with 
              eco-responsible principles, aligning every stage of production with 
              our environmental and human values.
            </p>
          </div>
          <p className="text-[#d98d6e] font-medium">
            Each Viveren piece is crafted with skill, care, and quiet dedication.
          </p>
        </div>

        {/* Right: Image */}
        <div className="w-full lg:w-1/2">
          <img 
            src="/path-to-your-image.jpg" 
            alt="Close up of garment collar" 
            className="w-full h-auto object-cover rounded-sm"
          />
        </div>
      </div>
    </section>
  );
};

export default FabricEngineeringwithPurpose;