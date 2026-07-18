import { useEffect, useMemo, useState } from 'react';

export default function DesignedForLongevity() {
  const [sectionData, setSectionData] = useState(null);
  const [previewOverride, setPreviewOverride] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/public/community-page-sections', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load sustainability sections');
        return res.json();
      })
      .then((json) => {
        if (cancelled) {
          return;
        }

        const sections = Array.isArray(json) ? json : [];
        const longevity = sections.find((section) => String(section?.key) === 'longevity');
        setSectionData(longevity || null);
      })
      .catch(() => {
        // keep fallback
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleBuilderPreviewMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (!data || data.type !== 'TIMLESS_PAGE_BUILDER_TOGETHER_LAYOUT_UPDATE') {
        return;
      }

      const sections = Array.isArray(data?.payload?.sections) ? data.payload.sections : [];
      const longevity = sections.find((section) => String(section?.key) === 'longevity');
      if (!longevity) {
        return;
      }

      setPreviewOverride(longevity);
    }

    window.addEventListener('message', handleBuilderPreviewMessage);
    return () => window.removeEventListener('message', handleBuilderPreviewMessage);
  }, []);

  const displayData = useMemo(() => {
    const source = previewOverride || sectionData;

    return {
      content_title: source?.contentTitle ?? source?.content_title ?? '',
      heading: source?.heading ?? 'Designed for Longevity',
      description: source?.sectionDescription ?? source?.section_description ?? source?.description ?? '',
      image: source?.featureImage ?? source?.feature_image ?? source?.image ?? null,
    };
  }, [previewOverride, sectionData]);

  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Text Content */}
        <div className="md:w-1/2 space-y-6">
          <p className="text-[#d98d6e] text-xs font-semibold tracking-widest uppercase">
            {displayData.content_title}
          </p>

          <h2 className="font-serif text-4xl text-[#2b2724]">
            {(() => {
              // Supports values like: "Designed for <i>Longevity</i>" from older drafts
              const heading = String(displayData.heading || '');
              const match = heading.match(/Designed for\s*<i>(.*?)<\/i>/i);
              if (match?.[1]) {
                return (
                  <>
                    Designed for <i>{match[1]}</i>
                  </>
                );
              }
              const parts = heading.split('Longevity');
              if (parts.length === 2) {
                return (
                  <>
                    {parts[0]}
                    <i>Longevity</i>
                    {parts[1]}
                  </>
                );
              }
              return heading;
            })()}
          </h2>

          <div className="space-y-4 text-[#4a4643] leading-relaxed">
            {String(displayData.description || '')
              .split('\n\n')
              .filter(Boolean)
              .map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
          </div>
        </div>

        {/* Image */}
        <div className="md:w-1/2 w-full">
          {displayData.image ? (
            <img
              src={displayData.image}
              alt="Designed for Longevity"
              className="w-full h-auto object-cover rounded-sm"
            />
          ) : (
            <div className="w-full h-64 bg-white/60 border border-dashed border-[#d98d6e] flex items-center justify-center rounded-sm text-[#4a4643]">
              No image uploaded
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

