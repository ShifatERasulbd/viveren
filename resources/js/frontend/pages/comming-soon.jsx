import React, { useEffect, useState } from 'react';


export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadHeroImage() {
      try {
        const slidesResponse = await fetch('/api/public/heroes', {
          headers: { Accept: 'application/json' },
        });
        if (slidesResponse.ok) {
          const slidesPayload = await slidesResponse.json();
          const firstImage = Array.isArray(slidesPayload)
            ? slidesPayload.find((slide) => slide?.image_url)?.image_url
            : '';
          if (!ignore && firstImage) {
            setBackgroundImage(firstImage);
            return;
          }
        }

        const response = await fetch('/api/public/hero', {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const payload = await response.json();
          if (!ignore && payload?.image_url) {
            setBackgroundImage(payload.image_url);
          }
        }
      } catch {
        // Keep the fallback background image on failure
      }
    }

    loadHeroImage();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = (e) => {
  e.preventDefault();
  if (email === 'it1@arbellafashion.com') {
    window.location.href = '/home';
    return;
  }
  if (email) {
    setSubmitted(true);
    // Handle your newsletter subscription logic here
  }
};

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans text-white">
      {/* Top Announcement Bar */}
      <div className="w-full bg-[#1a1a1a] py-2 text-center text-xs tracking-widest uppercase z-20 relative">
        Subscribe and save 10% on your first order
      </div>

      {/* Hero Section with Background Image */}
      <div 
        className="relative w-full h-[calc(100vh-32px)] bg-cover bg-center flex flex-col items-center justify-center px-4"
        style={{
          backgroundImage: `url('${backgroundImage}')`
        }}
      >
        {/* Dark Translucent Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-brightness-90 z-0"></div>

        {/* Content Box */}
        <div className="relative z-10 max-w-2xl text-center px-6 py-12 bg-black/20 backdrop-blur-xs rounded-lg flex flex-col items-center">
          
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl font-serif tracking-wide mb-6 font-normal">
            Something Worth Wearing.
          </h1>

          {/* Subtitle description */}
          <p className="text-xs md:text-sm text-gray-200 leading-relaxed max-w-lg mb-8 tracking-wide font-light">
            At Viveren, we believe the clothes you wear every day should never feel ordinary. 
            Inspired by the Latin word <i>vivere</i>—to live—we create elevated essentials that 
            combine timeless design, premium craftsmanship, and lasting comfort.
          </p>

         

          {/* Subscription Form */}
          {submitted ? (
            <div className="text-sm tracking-wide bg-white/10 px-6 py-3 rounded border border-white/20">
              Thank you for subscribing! We'll keep you updated.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row w-full max-w-md gap-0">
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent border-b border-white text-white placeholder-gray-300 px-3 py-3 text-sm focus:outline-none focus:border-gray-100"
              />
              <button
                type="submit"
                className="mt-4 sm:mt-0 bg-[#262626] hover:bg-[#383838] transition-colors text-white uppercase text-xs tracking-widest px-8 py-3 cursor-pointer font-medium"
              >
                Login
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}