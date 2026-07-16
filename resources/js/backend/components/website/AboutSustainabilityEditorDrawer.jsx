import { GripVertical, Image as ImageIcon, Plus, Settings2, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

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

const ITEM_TYPE = 'ABOUT_GIVING_BACK_POINT';

function PointRow({ point, index, onChangePoint, onRemovePoint, onReorderPoint }) {
    const ref = useRef(null);

    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: ITEM_TYPE,
            item: { index },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
        }),
        [index]
    );

    const [{ isOver }, drop] = useDrop(
        () => ({
            accept: ITEM_TYPE,
            hover(draggedItem, monitor) {
                if (!ref.current || draggedItem.index === index) {
                    return;
                }

                const hoverRect = ref.current.getBoundingClientRect();
                const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
                const clientOffset = monitor.getClientOffset();

                if (!clientOffset) {
                    return;
                }

                const hoverClientY = clientOffset.y - hoverRect.top;
                const movingForward = draggedItem.index < index;
                const crossedY = movingForward
                    ? hoverClientY >= hoverMiddleY
                    : hoverClientY <= hoverMiddleY;

                if (!crossedY) {
                    return;
                }

                onReorderPoint(draggedItem.index, index);
                draggedItem.index = index;
            },
            collect: (monitor) => ({
                isOver: monitor.isOver({ shallow: true }),
            }),
        }),
        [index, onReorderPoint]
    );

    drag(drop(ref));

    return (
        <div
            ref={ref}
            className={[
                'rounded-md border border-border p-3 transition-colors',
                isDragging ? 'opacity-40' : '',
                isOver ? 'bg-muted/60' : 'bg-background',
            ].join(' ')}
        >
            <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-medium">
                    <GripVertical className="size-4 text-muted-foreground" />
                    Point {index + 1}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemovePoint(index)}
                    title="Remove point"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>

            <div className="space-y-1">
                <Label>Point text</Label>
                <Input
                    value={point || ''}
                    onChange={(event) => onChangePoint(index, event.target.value)}
                    placeholder="Education Programs"
                />
            </div>
        </div>
    );
}

export default function AboutSustainabilityEditorDrawer({
    open,
    onOpenChange,
    value,
    onChangeField,
    onUploadImage,
    onChangePoint,
    onAddPoint,
    onRemovePoint,
    onReorderPoint,
    onSave,
    isSaving,
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="h-screen w-full overflow-y-auto sm:max-w-[480px] lg:max-w-[560px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings2 className="size-4" />
                        Sustainability Editor
                    </SheetTitle>
                   
                </SheetHeader>

                <div className="space-y-5 px-4 pb-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2" htmlFor="about-giving-back-image-upload">
                            <ImageIcon className="size-4" />
                            Image
                        </Label>
                        <Input
                            id="about-giving-back-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                    onUploadImage?.(file);
                                }
                            }}
                        />
                        {value.image ? (
                            <img
                                src={value.image}
                                alt="Sustainability section image preview"
                                className="h-44 w-full rounded-md border border-border object-cover"
                            />
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="about-giving-back-section-title">Section title</Label>
                        <Input
                            id="about-giving-back-section-title"
                            value={value.section_title || ''}
                            onChange={(event) => onChangeField('section_title', event.target.value)}
                            placeholder="Sustainability"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="about-giving-back-title">Title</Label>
                        <Input
                            id="about-giving-back-title"
                            value={value.title || ''}
                            onChange={(event) => onChangeField('title', event.target.value)}
                            placeholder="Roots Run Deep."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="about-giving-back-description">Description</Label>
                        <textarea
                            id="about-giving-back-description"
                            value={value.description || ''}
                            onChange={(event) => onChangeField('description', event.target.value)}
                            rows={8}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                            placeholder="Write section description paragraphs..."
                        />
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="button_title">Button Name</Label>
                        <Input
                            id="button_title"
                            value={value.button_title || ''}
                            onChange={(event) => onChangeField('button_title', event.target.value)}
                            placeholder="Learn More"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="button_link">Button Link</Label>
                        <Input
                            id="button_link"
                            value={value.button_link || ''}
                            onChange={(event) => onChangeField('button_link', event.target.value)}
                            placeholder="https://example.com"
                        />
                    </div>

                  
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
