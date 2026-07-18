import { useEffect, useMemo, useState } from 'react';

const MindfulMaterials = () => {
  const [sectionData, setSectionData] = useState(null);
  const [previewOverride, setPreviewOverride] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/public/community-page-sections', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (!cancelled && Array.isArray(json)) {
          const mindfulSection = json.find((section) => String(section?.key) === 'mindful-materials');
          setSectionData(mindfulSection || null);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleBuilderPreviewMessage(event) {
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (data?.type === 'TIMLESS_PAGE_BUILDER_TOGETHER_LAYOUT_UPDATE') {
        const sections = Array.isArray(data?.payload?.sections) ? data.payload.sections : [];
        const mindfulSection = sections.find((s) => String(s?.key) === 'mindful-materials');
        if (mindfulSection) setPreviewOverride(mindfulSection);
      }
    }

    window.addEventListener('message', handleBuilderPreviewMessage);
    return () => window.removeEventListener('message', handleBuilderPreviewMessage);
  }, []);

  const displayData = useMemo(() => {
    const source = previewOverride || sectionData;
    const rawDescription = String(
      source?.sectionDescription ?? source?.section_description ?? source?.description ?? '',
    );
    const descriptionParts = rawDescription
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      contentTitle: source?.contentTitle ?? source?.content_title ,
      heading: source?.heading,
      image: source?.featureImage ?? source?.feature_image ?? source?.image ?? null,
      introParagraph: descriptionParts[0] || '',
      listItems: descriptionParts.slice(1),
    };
  }, [previewOverride, sectionData]);

  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12">
        {/* Left: Image */}
        <div className="w-full lg:w-1/2">
          <img 
            src={displayData.image || '/uploads/heroes/images/hero1.webp'} 
            alt="Sustainability materials" 
            className="w-full h-auto object-cover rounded-sm"
          />
        </div>

        {/* Right: Content */}
        <div className="w-full lg:w-1/2 text-[#2b2724]">
          <p className="text-[#d98d6e] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            {displayData.contentTitle}
          </p>
          <h2 className="font-serif text-4xl mb-6">{displayData.heading}</h2>
          
          {displayData.introParagraph && (
            <p className="mb-6 leading-relaxed opacity-90">{displayData.introParagraph}</p>
          )}

          {displayData.listItems.length > 0 && (
            <div className="mb-8">
              <h3 className="font-medium mb-4">We work with:</h3>
              <ul className="space-y-4">
                {displayData.listItems.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <p>{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

       
        </div>
      </div>
    </section>
  );
};

export default MindfulMaterials;