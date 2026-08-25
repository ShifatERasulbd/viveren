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
    productOptions = [],
}) {
    // Backward compatible: accept the old prop name used by HomePageBuilder.
    const _noop = onChangeField;

    const [isSaving, setIsSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [currentImage, setCurrentImage] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState([]);

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
                const productIds = payload?.trending_section?.product_ids;
                if (!ignore && typeof image === 'string') {
                    setCurrentImage(image);
                    setPreviewUrl('');
                    setSelectedFile(null);
                }
                if (!ignore && Array.isArray(productIds)) {
                    setSelectedProductIds(
                        productIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0),
                    );
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

    function toggleProductId(productId) {
        setSelectedProductIds((previous) =>
            previous.includes(productId)
                ? previous.filter((id) => id !== productId)
                : [...previous, productId],
        );
    }

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

        const formData = new FormData();
        if (selectedFile) {
            formData.append('trending_image_file', selectedFile);
        }
        if (currentImage) {
            formData.append('trending_image_existing', currentImage);
        }
        selectedProductIds.forEach((productId) => {
            formData.append('trending_product_ids[]', productId);
        });

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
                throw new Error('Failed to save New Arrivals section');
            }

            const payload = await res.json();
            const image = payload?.trending_section?.image;

            if (typeof image === 'string') {
                setCurrentImage(image);
                setPreviewUrl('');
                setSelectedFile(null);
            }

            toast.success('New Arrivals section saved');
            onChangeField?.('trendingImage', image);
            onSave?.(image);
        } catch (e) {
            toast.error(e?.message || 'Failed to save New Arrivals section');
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
                        New Arrivals Personalization
                    </SheetTitle>
                    <SheetDescription>Upload the background image and choose which products appear in the New Arrivals section.</SheetDescription>
                </SheetHeader>

                <div className="space-y-5 px-4 pb-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="trending-image">New Arrivals Background Image</Label>
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
                                alt="New Arrivals background preview"
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

                    <div className="space-y-1">
                        <Label>Attached products</Label>
                        <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-input bg-background p-2">
                            {productOptions.length > 0 ? (
                                productOptions.map((product) => {
                                    const productId = Number(product.id);
                                    const checked = selectedProductIds.includes(productId);

                                    return (
                                        <label
                                            key={`trending-product-${productId}`}
                                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted/40"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleProductId(productId)}
                                                disabled={!canEdit || isSaving}
                                                className="size-3.5 rounded border-zinc-300 text-zinc-900"
                                            />
                                            <span className="line-clamp-1">{product.name}</span>
                                        </label>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-muted-foreground">No products found.</p>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Leave empty to automatically show the most recently added products.
                        </p>
                    </div>

                    <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                        Only the section background changes. The heading remains “New Arrivals”.
                    </div>
                </div>

                <SheetFooter>
                    <Button onClick={handleSave} disabled={!canEdit || isSaving}>
                        {isSaving ? 'Saving...' : 'Save New Arrivals Section'}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}


