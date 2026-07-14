import { Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

export default function TrendingProductEditorDrawer({
    open,
    onOpenChange,
    section,
    onChangeField,
    onSave,
}) {
    // Backward compatible: accept the old prop name used by HomePageBuilder.
    const _noop = onChangeField;

    const [isSaving, setIsSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [currentImage, setCurrentImage] = useState('');

    const canEdit = useMemo(() => Boolean(section?.key === 'trending'), [section]);

    useEffect(() => {
        if (!open) return;
        let ignore = false;

        async function loadCurrent() {
            try {
                const res = await fetch('/api/public/trending-section', {
                    headers: { Accept: 'application/json' },
                    credentials: 'include',
                });
                if (!res.ok) return;
                const payload = await res.json();
                const image = payload?.trending_section?.image;
                if (!ignore && typeof image === 'string') {
                    setCurrentImage(image);
                    setPreviewUrl('');
                    setSelectedFile(null);
                }
            } catch {
                // keep whatever is already there
            }
        }

        loadCurrent();
        return () => {
            ignore = true;
        };
    }, [open]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setPreviewUrl(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!canEdit) return;
        if (!selectedFile) {
            toast.error('Please choose an image');
            return;
        }

        const formData = new FormData();
        formData.append('trending_image_file', selectedFile);
        if (currentImage) {
            formData.append('trending_image_existing', currentImage);
        }

        try {
            setIsSaving(true);

            const res = await fetch('/api/trending-section', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });

            if (!res.ok) {
                throw new Error('Failed to save trending image');
            }

            const payload = await res.json();
            const image = payload?.trending_section?.image;

            if (typeof image === 'string') {
                setCurrentImage(image);
                setPreviewUrl('');
                setSelectedFile(null);
                toast.success('Trending image saved');
            }

            onChangeField?.('trendingImage', image);
            onSave?.(image);
        } catch (e) {
            toast.error(e?.message || 'Failed to save trending image');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="h-screen w-full overflow-y-auto sm:max-w-[420px] lg:max-w-[460px]"
            >
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings2 className="size-4" />
                        Trending Personalization
                    </SheetTitle>
                    <SheetDescription>Upload the image used as the Trending section background.</SheetDescription>
                </SheetHeader>

                <div className="space-y-5 px-4 pb-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="trending-image">Trending Background Image</Label>
                        <Input
                            id="trending-image"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={!canEdit || isSaving}
                        />

                        {(previewUrl || currentImage) && (
                            <img
                                src={previewUrl || currentImage}
                                alt="Trending background preview"
                                className="h-36 w-full rounded-md border border-border bg-background object-cover"
                            />
                        )}

                        <p className="text-xs text-muted-foreground">
                            {isSaving
                                ? 'Saving...'
                                : selectedFile
                                  ? 'Click Save to upload and persist.'
                                  : 'Upload an image to personalize this section.'}
                        </p>
                    </div>

                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                        Only the section background changes. The heading remains “Trending Products”.
                    </div>
                </div>

                <SheetFooter>
                    <Button onClick={handleSave} disabled={!canEdit || isSaving || !selectedFile}>
                        {isSaving ? 'Saving...' : 'Save Trending Image'}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

