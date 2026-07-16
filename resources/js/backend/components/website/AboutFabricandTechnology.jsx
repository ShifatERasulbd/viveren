import { Image as ImageIcon, Settings2 } from 'lucide-react';

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

export default function AboutFabricTechnologyEditorDrawer({
    open,
    onOpenChange,
    value,
    onChangeField,
    onUploadImage,
    onSave,
    isSaving,
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="h-screen w-full overflow-y-auto sm:max-w-[480px] lg:max-w-[560px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings2 className="size-4" />
                        Fabric &amp; Technology Editor
                    </SheetTitle>
                    <SheetDescription>
                        Edit the fabric and technology section content.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 px-4 pb-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2" htmlFor="fabric-tech-image-upload">
                            <ImageIcon className="size-4" />
                            Image
                        </Label>
                        <Input
                            id="fabric-tech-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) onUploadImage?.(file);
                            }}
                        />
                        {value.image ? (
                            <img
                                src={value.image}
                                alt="Fabric section image preview"
                                className="h-44 w-full rounded-md border border-border object-cover"
                            />
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fabric-tech-section-title">Section Title</Label>
                        <Input
                            id="fabric-tech-section-title"
                            value={value.section_title || ''}
                            onChange={(event) => onChangeField('section_title', event.target.value)}
                            placeholder="Fabric & Technology"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fabric-tech-title">Title</Label>
                        <Input
                            id="fabric-tech-title"
                            value={value.title || ''}
                            onChange={(event) => onChangeField('title', event.target.value)}
                            placeholder="Fabric, Engineered with Purpose"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fabric-tech-description">Description</Label>
                        <textarea
                            id="fabric-tech-description"
                            value={value.description || ''}
                            onChange={(event) => onChangeField('description', event.target.value)}
                            rows={6}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                            placeholder="Describe the fabric and technology..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fabric-tech-button-title">Button Name</Label>
                        <Input
                            id="fabric-tech-button-title"
                            value={value.button_title || ''}
                            onChange={(event) => onChangeField('button_title', event.target.value)}
                            placeholder="Discover Our Fabrics"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fabric-tech-button-link">Button Link</Label>
                        <Input
                            id="fabric-tech-button-link"
                            value={value.button_link || ''}
                            onChange={(event) => onChangeField('button_link', event.target.value)}
                            placeholder="https://example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fabric-tech-button-enabled">Show Button</Label>
                        <label
                            htmlFor="fabric-tech-button-enabled"
                            className="inline-flex cursor-pointer items-center gap-2"
                        >
                            <input
                                id="fabric-tech-button-enabled"
                                type="checkbox"
                                checked={Boolean(value.button_enabled ?? true)}
                                onChange={(event) => onChangeField('button_enabled', event.target.checked)}
                                className="size-4 rounded border-input"
                            />
                            <span className="text-sm text-muted-foreground">
                                {Boolean(value.button_enabled ?? true) ? 'Enabled' : 'Disabled'}
                            </span>
                        </label>
                    </div>
                </div>

                <SheetFooter>
                    <Button onClick={() => onSave?.()} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save To Database'}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
