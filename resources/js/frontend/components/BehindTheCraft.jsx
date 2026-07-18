import { useEffect, useMemo, useState } from 'react';

const fallbackBullets = [
  'Built in our own factory, with respect at the core.',
  'Human-first production. Fair labor, responsible environment.',
  'Integrity woven into every garment.',
];

const fallbackParagraphs = [
  'As owners of our manufacturing facility, we maintain direct oversight of how our garments are made.',
  'This allows us to uphold ethical labor practices, ensure safe and respectful working conditions, maintain consistent quality, and reduce unnecessary supply-chain complexity.',
];

const BehindTheCraft = () => {
  const [sectionData, setSectionData] = useState(null);
  const [previewOverride, setPreviewOverride] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/public/community-page-sections', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load sustainability sections');
        }

        return res.json();
      })
      .then((json) => {
        if (cancelled) {
          return;
        }

        const sections = Array.isArray(json) ? json : [];
        const target = sections.find((section) => String(section?.key) === 'behind-the-craft');
        setSectionData(target || null);
      })
      .catch(() => {
        // Keep fallback content.
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
      const target = sections.find((section) => String(section?.key) === 'behind-the-craft');
      if (!target) {
        return;
      }

      setPreviewOverride(target);
    }

    window.addEventListener('message', handleBuilderPreviewMessage);
    return () => window.removeEventListener('message', handleBuilderPreviewMessage);
  }, []);

  const displayData = useMemo(() => {
    const source = previewOverride || sectionData;
    const rawDescription = String(
      source?.sectionDescription ?? source?.section_description ?? source?.description ?? '',
    );

    const lines = rawDescription
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const bullets = lines
      .filter((line) => line.startsWith('- ') || line.startsWith('• '))
      .map((line) => line.replace(/^(-|•)\s*/, ''));

    const paragraphs = lines.filter((line) => !line.startsWith('- ') && !line.startsWith('• '));

    return {
      contentTitle: source?.contentTitle ?? source?.content_title ?? 'Fabric & Technology',
      heading: source?.heading ?? 'Behind the Craft',
      imageOne: source?.featureImage ?? source?.feature_image ?? source?.image ?? '/uploads/heroes/images/hero1.webp',
      imageTwo: source?.featureImage2 ?? source?.feature_image_2 ?? source?.image2 ?? source?.featureImage ?? source?.feature_image ?? '/uploads/heroes/images/hero1.webp',
      bullets: bullets.length > 0 ? bullets : fallbackBullets,
      paragraphs: paragraphs.length > 0 ? paragraphs : fallbackParagraphs,
    };
  }, [previewOverride, sectionData]);

  return (
    <section className="bg-[#f5f0e9] py-16 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <img
            src={displayData.imageOne}
            alt="Worker at sewing machine"
            className="w-full h-full object-cover rounded-sm"
          />
          <img
            src={displayData.imageTwo}
            alt="Worker operating machine"
            className="w-full h-full object-cover rounded-sm"
          />
        </div>

        <div className="text-[#2b2724]">
          <p className="text-[#d98d6e] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            {displayData.contentTitle}
          </p>
          <h2 className="font-serif text-4xl mb-6">{displayData.heading}</h2>

          <ul className="space-y-2 mb-8 opacity-90">
            {displayData.bullets.map((item, index) => (
              <li key={`${item}-${index}`}>• {item}</li>
            ))}
          </ul>

          <div className="space-y-6 text-[#4a4643] leading-relaxed mb-6">
            {displayData.paragraphs.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`}>{paragraph}</p>
            ))}
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