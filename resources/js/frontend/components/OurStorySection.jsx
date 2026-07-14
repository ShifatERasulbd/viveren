export default function TimelessAboutSection() {
  const productItems = [
    { id: 1, title: 'Timeless Piece 1', price: 59 },
    { id: 2, title: 'Timeless Piece 2', price: 69 },
    { id: 3, title: 'Timeless Piece 3', price: 79 },
    { id: 4, title: 'Timeless Piece 4', price: 89 },
    { id: 5, title: 'Timeless Piece 5', price: 99 },
  ];

  // We triplicate the array so there are 15 cards in the circle.
  // This reduces the angle between adjacent cards so 4-5 are always visible in front!
  const extendedItems = [...productItems, ...productItems, ...productItems];
  const totalItems = extendedItems.length;

  return (
    <section className="relative w-full overflow-hidden bg-[#f4f2ed] py-16">
      <h3 className="mb-12 text-center font-serif text-4xl text-zinc-900">Trending Products</h3>

      {/* 
        Full-width container (max-w-[1600px]) so 4 items fit side-by-side easily.
        Perspective set to 1600px for a natural 3D curve without extreme distortion.
      */}
      <div className="relative mx-auto flex h-[480px] w-full max-w-[1600px] items-center justify-center overflow-hidden [perspective:1600px]">
        
        {/* Smooth, continuous rolling effect */}
        <div 
          className="relative flex h-full w-full items-center justify-center [transform-style:preserve-3d] animate-[continuous-roll_35s_linear_infinite]"
        >
          {extendedItems.map((p, i) => {
            // With 15 items, each card is only 24 degrees apart (360 / 15)
            const rotation = i * (360 / totalItems);
            return (
              <article
                key={`${p.id}-${i}`}
                className="absolute flex w-[260px] flex-col rounded-[1.8rem] bg-white p-4 shadow-xl transition-all duration-300 hover:shadow-2xl"
                style={{
                  // translateZ(800px) expands the circle wide enough to show 4 items side-by-side!
                  transform: `rotateY(${rotation}deg) translateZ(800px)`,
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className="h-[280px] w-full overflow-hidden rounded-[1.2rem] bg-zinc-100">
                  <img
                    src={`/uploads/products/product-${p.id}.webp`}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-4 text-center">
                  <h4 className="text-base font-medium text-zinc-900">{p.title}</h4>
                  <p className="mt-1 text-sm font-bold text-zinc-900">$ {p.price}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes continuous-roll {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(-360deg); }
        }
      `}</style>
    </section>
  );
}