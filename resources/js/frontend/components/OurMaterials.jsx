import { useEffect, useMemo, useState } from 'react';

const FabricInnovations = () => {
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
          const target = json.find((section) => String(section?.key) === 'fabric-innovations');
          setSectionData(target || null);
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
        const target = sections.find((s) => String(s?.key) === 'fabric-innovations');
        if (target) setPreviewOverride(target);
      }
    }

    window.addEventListener('message', handleBuilderPreviewMessage);
    return () => window.removeEventListener('message', handleBuilderPreviewMessage);
  }, []);

  const displayData = useMemo(() => {
    const source = previewOverride || sectionData;
    const items = source?.ourMaterialsItems ?? source?.our_materials_items ?? [];

    return {
      sectionLabel: source?.contentTitle ?? source?.content_title,
      sectionHeading: source?.heading,
      sectionDescription: String(source?.sectionDescription ?? source?.section_description ?? source?.description ?? '').trim(),
      items: Array.isArray(items) ? items : [],
    };
  }, [previewOverride, sectionData]);

  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="text-center mb-16">
        <p className="text-[#d98d6e] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
          {displayData.sectionLabel}
        </p>
        <h2 className="font-serif text-4xl md:text-5xl text-[#2b2724]">
          {displayData.sectionHeading}
        </h2>
      </div>

      {displayData.sectionDescription && (
        <div className="mx-auto mb-12 max-w-4xl text-center text-[#4a4643]">
          <p className="leading-relaxed">{displayData.sectionDescription}</p>
        </div>
      )}

      {displayData.items.length > 0 && (
        <div className="max-w-7xl mx-auto space-y-8">
          {displayData.items.map((item, index) => (
            <article
              key={item.id || `${item.contentTitle || 'material'}-${index}`}
              className="flex flex-col gap-6 rounded-2xl border border-[#d8cfc2] bg-[#f8f3ec] p-6 shadow-sm lg:flex-row lg:items-center"
            >
              <div className="text-[#2b2724] lg:w-1/2">
                <h3 className="font-serif text-3xl mb-2">{item.contentHeader || 'Material'}</h3>
                <p className="text-[#d98d6e] text-xs font-bold tracking-[0.1em] uppercase mb-6">
                  {item.contentTitle || 'Content title'}
                </p>
                <p className="leading-relaxed opacity-90">{item.details || 'Material details go here.'}</p>
              </div>

              {item.image && (
                <div className="overflow-hidden rounded-xl bg-[#efe6da] lg:w-1/2">
                  <img
                    src={item.image}
                    alt={item.contentHeader || 'Our materials image'}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default FabricInnovations;