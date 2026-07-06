import { useEffect, useMemo, useRef, useState } from 'react';
import { timelessFontClass } from '../utils/typography';
import {
  resolveHeroFontFamily,
  resolveHeroFontSize,
} from '../../utils/heroTypography';
import { sectionTypography } from '../utils/sectionTypography';

function resolveMediaUrl(value = '') {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    return raw;
  }

  return `/${raw.replace(/^\/+/, '')}`;
}

function splitHeroTitle(value, mode = 'double') {
  const title = String(value || '').trim();
  if (!title) {
    return [];
  }
  if (mode === 'single') {
    return [title];
  }
  const words = title.split(/\s+/);
  if (words.length <= 2) {
    return [title];
  }
  const middle = Math.ceil(words.length / 2);
  return [words.slice(0, middle).join(' '), words.slice(middle).join(' ')];
}

export default function Hero() {
  const [heroData, setHeroData] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [previewOverride, setPreviewOverride] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilderPreview] = useState(() => {
    try {
      return window.self !== window.top;
    } catch {
      return false;
    }
  });
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= 640;
  });

  const dragStateRef = useRef(null);
  const partOffsetFields = {
    title: ['title_offset_x', 'title_offset_y'],
    description: ['description_offset_x', 'description_offset_y'],
    button: ['button_offset_x', 'button_offset_y'],
  };

  useEffect(() => {
    let ignore = false;
    async function loadHero() {
      try {
        setIsLoading(true);
        const slidesResponse = await fetch('/api/public/heroes', {
          headers: { Accept: 'application/json' },
        });
        if (slidesResponse.ok) {
          const slidesPayload = await slidesResponse.json();
          if (!ignore && Array.isArray(slidesPayload) && slidesPayload.length > 0) {
            setHeroSlides(slidesPayload);
            setHeroData(slidesPayload[0]);
            setIsLoading(false);
            return;
          }
        }
        const response = await fetch('/api/public/hero', {
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const payload = await response.json();
          if (!ignore && payload) {
            setHeroData(payload);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    loadHero();
    console.log(loadHero());
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (heroSlides.length === 0) return;
    setCurrentSlide((prev) => (prev >= heroSlides.length ? 0 : prev));
  }, [heroSlides]);

  useEffect(() => {
    function handleViewportResize() {
      setIsMobileViewport(window.innerWidth <= 640);
    }
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    function handleBuilderPreviewMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.type === 'TIMLESS_PAGE_BUILDER_HERO_PREVIEW_UPDATE') {
        setPreviewOverride((prev) => ({ ...(prev || {}), ...(data.payload || {}) }));
      }
    }
    window.addEventListener('message', handleBuilderPreviewMessage);
    return () => window.removeEventListener('message', handleBuilderPreviewMessage);
  }, []);

  const activeHero = heroSlides.length > 0 ? heroSlides[currentSlide] : heroData;
  const displayHeroData = previewOverride ? { ...activeHero, ...previewOverride } : activeHero;
  const slidesCount = heroSlides.length > 0 ? heroSlides.length : 1;

  const titleLines = useMemo(
    () => splitHeroTitle(displayHeroData?.title, displayHeroData?.title_display_mode || 'double'),
    [displayHeroData?.title, displayHeroData?.title_display_mode]
  );
  
  const fullDescription = String(displayHeroData?.description || '');
  const heroImage = useMemo(
    () => displayHeroData?.image_url || '',
    [displayHeroData?.image_url]
  );

  const maxTitleCharIndex = useMemo(
    () => titleLines.reduce((max, line, idx) => Math.max(max, idx * 12 + Math.max(Array.from(line || '').length - 1, 0)), 0),
    [titleLines]
  );

  const [titleAnimationCycle, setTitleAnimationCycle] = useState(0);
  const [typedDescription, setTypedDescription] = useState('');
  const [isDescriptionDeleting, setIsDescriptionDeleting] = useState(false);

  useEffect(() => {
    if (isLoading || titleLines.length === 0) return;
    const cycleDurationMs = maxTitleCharIndex * 110 + 700 + 3000;
    const intervalId = window.setInterval(() => setTitleAnimationCycle((c) => c + 1), cycleDurationMs);
    return () => window.clearInterval(intervalId);
  }, [isLoading, titleLines, maxTitleCharIndex]);

  useEffect(() => {
    setTypedDescription('');
    setIsDescriptionDeleting(false);
  }, [fullDescription]);

  useEffect(() => {
    if (isLoading || !fullDescription) return;
    const isDone = typedDescription.length >= fullDescription.length;
    const isZero = typedDescription.length === 0;
    const delay = isDescriptionDeleting ? (isZero ? 420 : 36) : (isDone ? 1500 : 62);

    const timeoutId = window.setTimeout(() => {
      if (isDescriptionDeleting) {
        if (isZero) setIsDescriptionDeleting(false);
        else setTypedDescription(fullDescription.slice(0, typedDescription.length - 1));
      } else {
        if (isDone) setIsDescriptionDeleting(true);
        else setTypedDescription(fullDescription.slice(0, typedDescription.length + 1));
      }
    }, delay);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading, fullDescription, typedDescription, isDescriptionDeleting]);

  // Calculations
  const titleSize = resolveHeroFontSize(displayHeroData?.title_font_size, 86);
  const descriptionSize = resolveHeroFontSize(displayHeroData?.description_font_size, 24);
  const titleFamily = resolveHeroFontFamily(displayHeroData?.title_font_family, 'montserrat');
  const descriptionFamily = resolveHeroFontFamily(displayHeroData?.description_font_family, 'montserrat');
  const displayTitleSize = Math.max(50, Math.round(titleSize * 0.58));
  const displayDescriptionSize = Math.max(16, Math.round(descriptionSize * 0.72));
  const mobileOffsetFactor = isMobileViewport ? 0.45 : 1;

  function beginPartDrag(part, event) {
    if (!isBuilderPreview || isLoading) return;
    event.preventDefault();
    event.stopPropagation();
    const [xField, yField] = partOffsetFields[part] || [];
    dragStateRef.current = { part, xField, yField, startX: event.clientX, startY: event.clientY, baseOffsetX: Number(displayHeroData?.[xField]) || 0, baseOffsetY: Number(displayHeroData?.[yField]) || 0 };
  }

  useEffect(() => {
    if (!isBuilderPreview) return;
    function handleMouseMove(event) {
      if (!dragStateRef.current) return;
      const drag = dragStateRef.current;
      const deltaXPercent = ((event.clientX - drag.startX) / Math.max(window.innerWidth, 1)) * 100;
      const deltaYPercent = ((event.clientY - drag.startY) / Math.max(window.innerHeight, 1)) * 100;
      setPreviewOverride((prev) => ({ ...(prev || {}), [drag.xField]: Math.max(-55, Math.min(55, drag.baseOffsetX + deltaXPercent)), [drag.yField]: Math.max(-55, Math.min(55, drag.baseOffsetY + deltaYPercent)) }));
    }
    const handlePointerUp = () => (dragStateRef.current = null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handlePointerUp); };
  }, [isBuilderPreview]);

  const renderBackground = useMemo(() => {
    if (isLoading) return <div className="absolute inset-0 -z-30 h-full w-full bg-neutral-900 animate-pulse" />;
    return <img src={heroImage} alt="Hero background" className="hero-media absolute inset-0 -z-30 h-full w-full object-cover object-center" />;
  }, [heroImage, isLoading]);

  return (
    <section className={`${timelessFontClass} hero-section relative isolate min-h-[calc(100vh-90px)] overflow-hidden text-zinc-900`}>
      <style>{`
        .hero-scale-in-char { display: inline-block; opacity: 0; transform: scale(0); animation: scaleInText 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes scaleInText { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
        .hero-typewriter-caret { display: inline-block; margin-left: 0.06em; animation: typewriterCaretBlink 1s step-end infinite; }
        @keyframes typewriterCaretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
      `}</style>
      {renderBackground}
      <div className="hero-shell mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-[1920px] items-end justify-start px-5 py-10 sm:px-8 lg:px-12">
        <div className="hero-content relative flex w-full max-w-[760px] flex-col items-start space-y-3 text-left" style={{ transform: `translate(${(Number(displayHeroData?.text_offset_x) || 0) * mobileOffsetFactor}%, ${(Number(displayHeroData?.text_offset_y) || 0) * mobileOffsetFactor}%)` }}>
          {isLoading ? <div className="animate-pulse space-y-3"><div className="h-12 w-4/5 rounded bg-white/20" /></div> : (
            <>
              <h1 
                className="text-white" // Added this class for pure white
                onMouseDown={(e) => beginPartDrag('title', e)} 
                style={{ 
                  fontFamily: titleFamily, 
                  fontSize: `clamp(1.6rem, 6vw, ${displayTitleSize}px)` 
                }}
              >
                {titleLines.map((line, i) => (
                  <span key={i} className="block">
                    {Array.from(line).map((char, ci) => (
                      <span 
                        key={ci} 
                        className="hero-scale-in-char" 
                        style={{ animationDelay: `${(i * 12 + ci) * 0.08}s` }}
                      >
                        {char === ' ' ? '\u00A0' : char}
                      </span>
                    ))}
                  </span>
                ))}
              </h1>
              
              {Boolean(displayHeroData?.button_enabled ?? true) && (
                <a href={'/new-arrivals'} className={sectionTypography.heroPrimaryButton}>Shop New Arrivals</a>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}