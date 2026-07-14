import { Settings2 } from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';

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

export default function HeroEditorDrawer({
    open,
    onOpenChange,
    activePart,
    value,
    onChange,
    onUploadImage,
    onUploadVideo,
    onSave,
    isSaving,
}) {
    const headerTitleItems = Array.isArray(value.header_title_items) && value.header_title_items.length > 0
        ? value.header_title_items
        : [value.header_title || ''];

    function updateHeaderTitleItem(index, nextValue) {
        const nextItems = [...headerTitleItems];
        nextItems[index] = nextValue;
        onChange('header_title_items', nextItems);
        onChange('header_title', nextItems.find((item) => String(item || '').trim()) || '');
    }

    function addHeaderTitleItem() {
        const nextItems = [...headerTitleItems, ''];
        onChange('header_title_items', nextItems);
    }

    function removeHeaderTitleItem(index) {
        const nextItems = headerTitleItems.filter((_, itemIndex) => itemIndex !== index);
        const safeItems = nextItems.length > 0 ? nextItems : [''];
        onChange('header_title_items', safeItems);
        onChange('header_title', safeItems.find((item) => String(item || '').trim()) || '');
    }

    const showAll = !activePart || activePart === 'all';
    const showTitle = showAll || activePart === 'title';
    const showDescription = showAll || activePart === 'description';
    const showButton = showAll || activePart === 'button';
        const activePartLabel =
                activePart === 'title'
                        ? 'Title'
                        : activePart === 'description'
                            ? 'Description'
                            : activePart === 'button'
                                ? 'Button'
                                : 'All';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="h-screen w-full overflow-y-auto sm:max-w-[380px] lg:max-w-[400px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings2 className="size-4" />
                        Hero Component Editor
                    </SheetTitle>
                    <div>
                        <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            Editing: {activePartLabel}
                        </span>
                    </div>
                    <SheetDescription>
                        {activePart === 'title'
                            ? 'Title settings'
                            : activePart === 'description'
                              ? 'Description settings'
                              : activePart === 'button'
                                ? 'Button settings'
                                : 'Update hero image, title, and description. Changes are reflected live in the page preview.'}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 px-4 pb-4">
                    {showTitle ? (
                    <div className="space-y-2">
                        <Label htmlFor="hero-title-mode">Title line mode</Label>
                        <select
                            id="hero-title-mode"
                            value={value.title_display_mode || 'double'}
                            onChange={(event) => onChange('title_display_mode', event.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="single">Single line</option>
                            <option value="double">Double line</option>
                        </select>
                    </div>
                    ) : null}

                    {showAll ? (
                    <div className="space-y-2">
                        <Label htmlFor="hero-image-upload">Upload image</Label>
                        <Input
                            id="hero-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    onUploadImage?.(file);
                                }
                            }}
                        />

                        {value.image_url ? (
                            <div className="overflow-hidden rounded-md border border-border bg-muted/20">
                                <img
                                    src={value.image_url}
                                    alt="Uploaded hero preview"
                                    className="h-40 w-full object-cover"
                                />
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Upload an image to preview it here.
                            </p>
                        )}
                    </div>
                    ) : null}

                    {showAll ? (
                    <div className="space-y-2">
                        <Label htmlFor="hero-video">Hero video URL</Label>
                        <Input
                            id="hero-video"
                            value={value.video_url || ''}
                            onChange={(event) => onChange('video_url', event.target.value)}
                            placeholder="https://example.com/hero-video.mp4"
                        />
                    </div>
                    ) : null}

                    {showAll ? (
                    <div className="space-y-2">
                        <Label htmlFor="hero-video-upload">Upload video</Label>
                        <Input
                            id="hero-video-upload"
                            type="file"
                            accept="video/*"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    onUploadVideo?.(file);
                                }
                            }}
                        />
                    </div>
                    ) : null}

                    {showTitle ? (
                    <div className="space-y-2">
                        <Label htmlFor="hero-title">Hero title</Label>
                        <Input
                            id="hero-title"
                            value={value.title}
                            onChange={(event) => onChange('title', event.target.value)}
                            placeholder="Custom apparel solutions"
                        />
                    </div>
                    ) : null}

                    {showTitle ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <Label>Header title repeater</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addHeaderTitleItem}>
                                <Plus className="mr-2 size-4" />
                                Add title
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {headerTitleItems.map((item, index) => (
                                <div key={index} className="space-y-2 rounded-md border border-border bg-background p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label htmlFor={`header-title-${index}`}>Title {index + 1}</Label>
                                        {headerTitleItems.length > 1 ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeHeaderTitleItem(index)}
                                                aria-label={`Remove title ${index + 1}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        ) : null}
                                    </div>
                                    <Input
                                        id={`header-title-${index}`}
                                        value={item || ''}
                                        onChange={(event) => updateHeaderTitleItem(index, event.target.value)}
                                        placeholder="SUBSCRIBE AND SAVE 10% ON YOUR FIRST ORDER"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    ) : null}

                    

                
                   

                 

           

                  

                    
                    

                    {showButton ? (
                    <div className="space-y-2">
                        <Label htmlFor="hero-button-enabled">Show button</Label>
                        <label
                            htmlFor="hero-button-enabled"
                            className="inline-flex cursor-pointer items-center gap-2"
                        >
                            <input
                                id="hero-button-enabled"
                                type="checkbox"
                                checked={Boolean(value.button_enabled ?? true)}
                                onChange={(event) => onChange('button_enabled', event.target.checked)}
                                className="size-4 rounded border-input"
                            />
                            <span className="text-sm text-muted-foreground">
                                {Boolean(value.button_enabled ?? true) ? 'Enabled' : 'Disabled'}
                            </span>
                        </label>
                    </div>
                    ) : null}

                    {showButton ? (
                    <div className="space-y-2">
                        <Label htmlFor="hero-button-url">Button redirect URL</Label>
                        <Input
                            id="hero-button-url"
                            value={value.button_url || '/shop'}
                            onChange={(event) => onChange('button_url', event.target.value)}
                            placeholder="/shop"
                        />
                    </div>
                    ) : null}

                  
                </div>

                <SheetFooter>
                    <Button onClick={() => onSave?.()} disabled={isSaving}>
                        {isSaving ? 'Saving Hero...' : 'Save To Database'}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
