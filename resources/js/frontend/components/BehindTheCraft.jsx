import React from 'react';

const BehindTheCraft = () => {
  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Images Column (Spans 2 on large screens) */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <img src="/path-to-image-1.jpg" alt="Worker at sewing machine" className="w-full h-full object-cover rounded-sm" />
          <img src="/path-to-image-2.jpg" alt="Worker operating machine" className="w-full h-full object-cover rounded-sm" />
        </div>

        {/* Content Column */}
        <div className="text-[#2b2724]">
          <p className="text-[#d98d6e] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            Fabric & Technology
          </p>
          <h2 className="font-serif text-4xl mb-6">Behind the Craft</h2>
          
          <ul className="space-y-2 mb-8 opacity-90">
            <li>• Built in our own factory, with respect at the core.</li>
            <li>• Human-first production. Fair labor, responsible environment.</li>
            <li>• Integrity woven into every garment</li>
          </ul>

          <div className="space-y-6 text-[#4a4643] leading-relaxed mb-6">
            <p>As owners of our manufacturing facility, we maintain direct oversight of how our garments are made.</p>
            <p>This allows us to uphold ethical labor practices, ensure safe and respectful working conditions, maintain consistent quality, and reduce unnecessary supply-chain complexity. Our factory operates with eco-responsible principles, aligning every stage of production with our environmental and human values.</p>
          </div>

          <p className="text-[#d98d6e] font-medium">
            Each Viveren piece is crafted with skill, care, and quiet dedication.
          </p>
        </div>
      </div>
    </section>
  );
};

export default BehindTheCraft;