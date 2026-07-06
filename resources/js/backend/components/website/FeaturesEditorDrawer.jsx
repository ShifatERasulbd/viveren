import { GripVertical, Plus, Settings2, Trash2 } from 'lucide-react';
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

const ITEM_TYPE = 'FEATURE_ITEM';

function FeatureItemRow({ item, index, onChangeItem, onUploadIcon, onRemoveItem, onReorderItem }) {
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

    const [, drop] = useDrop(
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

                if (draggedItem.index < index && hoverClientY < hoverMiddleY) {
                    return;
                }

                if (draggedItem.index > index && hoverClientY > hoverMiddleY) {
                    return;
                }

                onReorderItem(draggedItem.index, index);
                draggedItem.index = index;
            },
        }),
        [index, onReorderItem]
    );

    drag(drop(ref));

    return (
        <div
            ref={ref}
            className={`space-y-2 rounded-md border border-border p-3 ${
                isDragging ? 'opacity-45' : 'opacity-100'
            }`}
        >
            <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <GripVertical className="size-3.5" />
                Drag to reorder
            </div>

            <div className="space-y-1">
                <Label htmlFor={`feature-title-${index}`}>Card title</Label>
                <Input
                    id={`feature-title-${index}`}
                    value={item.title || ''}
                    onChange={(event) => onChangeItem(index, 'title', event.target.value)}
                />
            </div>

            <div className="space-y-1">
                <Label htmlFor={`feature-icon-${index}`}>Icon image</Label>
                <Input
                    id={`feature-icon-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                            onUploadIcon(index, file);
                        }
                    }}
                />
                {item.icon_url || item.icon ? (
                    <div className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                        <img
                            src={item.icon_url || item.icon}
                            alt="Feature icon preview"
                            className="size-5 object-contain"
                        />
                        Icon selected
                    </div>
                ) : null}
            </div>

            <div className="space-y-1">
                <Label htmlFor={`feature-short-description-${index}`}>Short description</Label>
                <textarea
                    id={`feature-short-description-${index}`}
                    rows={3}
                    value={item.short_description || ''}
                    onChange={(event) =>
                        onChangeItem(index, 'short_description', event.target.value)
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onRemoveItem(index)}
            >
                <Trash2 className="mr-2 size-4" />
                Remove Item
            </Button>
        </div>
    );
}

export default function FeaturesEditorDrawer({
    open,
    onOpenChange,
    value,
    activeItemIndex,
    onChangeField,
    onChangeItem,
    onUploadIcon,
    onAddItem,
    onRemoveItem,
    onReorderItem,
    onSave,
    isSaving,
}) {
    const hasActiveItem = Number.isInteger(activeItemIndex) && activeItemIndex >= 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="h-screen w-full overflow-y-auto sm:max-w-[380px] lg:max-w-[400px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Settings2 className="size-4" />
                        Features Section Editor
                    </SheetTitle>
                    <SheetDescription>
                        {hasActiveItem
                            ? `Editing card ${activeItemIndex + 1}. Click outside cards in preview to show all cards.`
                            : 'Customize feature cards and drag to change their order.'}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 px-4 pb-4">
                    <div className="space-y-1">
                        <Label htmlFor="features-columns">Per view (desktop)</Label>
                        <Input
                            id="features-columns"
                            type="number"
                            min={1}
                            max={4}
                            value={value.columns || 4}
                            onChange={(event) =>
                                onChangeField('columns', Number(event.target.value) || 4)
                            }
                        />
                    </div>

                    <div className="space-y-3">
                        {value.items
                            .map((item, index) => ({ item, index }))
                            .filter(({ index }) => !hasActiveItem || index === activeItemIndex)
                            .map(({ item, index }) => (
                                <FeatureItemRow
                                    key={`feature-item-${index}`}
                                    item={item}
                                    index={index}
                                    onChangeItem={onChangeItem}
                                    onUploadIcon={onUploadIcon}
                                    onRemoveItem={onRemoveItem}
                                    onReorderItem={onReorderItem}
                                />
                            ))}
                    </div>

                    <Button type="button" variant="outline" onClick={onAddItem} className="w-full">
                        <Plus className="mr-2 size-4" />
                        Add Feature Item
                    </Button>
                </div>

                <SheetFooter>
                    <Button onClick={onSave} disabled={isSaving}>
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
