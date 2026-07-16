import React from 'react';

const Hero = () => {
    return (
        <section className="bg-[#2b2724] py-20 px-6 text-center text-white">
            <div className="max-w-4xl mx-auto">
                {/* Label */}
                <p className="text-xs uppercase tracking-[0.2em] opacity-80 mb-4">
                    Our Responsibility
                </p>
                
                {/* Title */}
                <h1 className="font-serif text-4xl md:text-6xl font-light mb-6">
                    Sustainability & Responsibility
                </h1>
                
                {/* Subtitle */}
                <p className="font-serif text-lg md:text-xl opacity-90">
                    How We Think, Design, and Build with Care
                </p>
            </div>
        </section>
    );
};

export default Hero;