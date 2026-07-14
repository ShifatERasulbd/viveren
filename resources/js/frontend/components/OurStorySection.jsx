import { useEffect, useState } from 'react';

export default function TimelessAboutSection() {
  const productItems = [
    { id: 1, title: 'Timeless Piece 1', price: 59 },
    { id: 2, title: 'Timeless Piece 2', price: 69 },
    { id: 3, title: 'Timeless Piece 3', price: 79 },
    { id: 4, title: 'Timeless Piece 4', price: 89 },
    { id: 5, title: 'Timeless Piece 5', price: 99 },
  ];

  const extendedItems = [...productItems, ...productItems, ...productItems];
  const totalItems = extendedItems.length;

  const [radius, setRadius] = useState(620);
  const [cardWidth, setCardWidth] = useState(250);

  useEffect(() => {
    const updateCarousel = () => {
      const width = window.innerWidth;

      if (width >= 1600) {
        setRadius(720);
        setCardWidth(260);
      } else if (width >= 1400) {
        setRadius(660);
        setCardWidth(250);
      } else if (width >= 1200) {
        setRadius(600);
        setCardWidth(235);
      } else if (width >= 992) {
        setRadius(520);
        setCardWidth(220);
      } else if (width >= 768) {
        setRadius(440);
        setCardWidth(200);
      } else {
        setRadius(320);
        setCardWidth(170);
      }
    };

    updateCarousel();
    window.addEventListener('resize', updateCarousel);

    return () => window.removeEventListener('resize', updateCarousel);
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-[#f4f2ed] py-16">
      <h3 className="mb-12 text-center font-serif text-4xl text-zinc-900">
        Trending Products
      </h3>

      <div className="relative mx-auto flex h-[500px] md:h-[540px] lg:h-[560px] w-full max-w-[1700px] items-center justify-center overflow-hidden [perspective:1800px]">
        <div className="relative flex h-full w-full items-center justify-center [transform-style:preserve-3d] animate-[pause-roll_45s_linear_infinite]">
          {extendedItems.map((p, i) => {
            const rotation = i * (360 / totalItems);

            return (
              <article
                key={`${p.id}-${i}`}
                className="absolute flex flex-col rounded-[2rem] bg-white p-5 shadow-xl transition-all duration-300 hover:scale-105"
                style={{
                  width: `${cardWidth}px`,
                  transform: `rotateY(${rotation}deg) translateZ(${radius}px)`,
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className="h-[160px] md:h-[1950px] lg:h-[280px] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
                  <img
                    src={`/uploads/products/product-${p.id}.webp`}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs md:text-sm">
                    {p.title}
                  </p>

                  <p className="mt-2 text-xs md:text-sm ">
                    ${p.price.toFixed(2)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pause-roll {
          0%, 4.44% { transform: rotateY(0deg); }
          6.66% { transform: rotateY(-24deg); }
          6.66%, 11.1% { transform: rotateY(-24deg); }
          13.33% { transform: rotateY(-48deg); }
          13.33%, 17.77% { transform: rotateY(-48deg); }
          20% { transform: rotateY(-72deg); }
          20%, 24.44% { transform: rotateY(-72deg); }
          26.66% { transform: rotateY(-96deg); }
          26.66%, 31.11% { transform: rotateY(-96deg); }
          33.33% { transform: rotateY(-120deg); }
          33.33%, 37.77% { transform: rotateY(-120deg); }
          40% { transform: rotateY(-144deg); }
          40%, 44.44% { transform: rotateY(-144deg); }
          46.66% { transform: rotateY(-168deg); }
          46.66%, 51.11% { transform: rotateY(-168deg); }
          53.33% { transform: rotateY(-192deg); }
          53.33%, 57.77% { transform: rotateY(-192deg); }
          60% { transform: rotateY(-216deg); }
          60%, 64.44% { transform: rotateY(-216deg); }
          66.66% { transform: rotateY(-240deg); }
          66.66%, 71.11% { transform: rotateY(-240deg); }
          73.33% { transform: rotateY(-264deg); }
          73.33%, 77.77% { transform: rotateY(-264deg); }
          80% { transform: rotateY(-288deg); }
          80%, 84.44% { transform: rotateY(-288deg); }
          86.66% { transform: rotateY(-312deg); }
          86.66%, 91.11% { transform: rotateY(-312deg); }
          93.33% { transform: rotateY(-336deg); }
          93.33%, 97.77% { transform: rotateY(-336deg); }
          100% { transform: rotateY(-360deg); }
        }
      `}</style>
    </section>
  );
}