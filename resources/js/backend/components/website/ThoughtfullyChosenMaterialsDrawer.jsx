import React, { useEffect, useMemo, useState } from 'react';

// Drawer editor for “Thoughtfully Chosen Materials” sustainability section.
// This file focuses on the requested builder UI inputs and repeater structure.

export default function ThoughtfullyChosenMaterialsDrawer({
  isOpen,
  initialData,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    sectionHeader: '',
    sectionTitle: '',
    items: [
      {
        contentTitle: '',
        description: '',
        image: null, // File
        imageUrl: '', // existing preview/url
      },
    ],
  }));

  useEffect(() => {
    if (!isOpen) return;

    const src = initialData || {};

    // Support both possible data shapes from your builder:
    // - { sectionHeader, sectionTitle, items: [...] }
    // - { section_header, heading, items: [...] }
    const sectionHeader = src.sectionHeader ?? src.section_header ?? '';
    const sectionTitle = src.sectionTitle ?? src.section_title ?? src.heading ?? '';

    const items = Array.isArray(src.items) ? src.items : (Array.isArray(src.repeater) ? src.repeater : []);

    setForm({
      sectionHeader,
      sectionTitle,
      items: items.length
        ? items.map((it) => ({
            contentTitle: it.contentTitle ?? it.content_title ?? '',
            description: it.description ?? it.desc ?? '',
            image: null,
            imageUrl: it.imageUrl ?? it.image_url ?? it.image ?? '',
          }))
        : [
            {
              contentTitle: '',
              description: '',
              image: null,
              imageUrl: '',
            },
          ],
    });
  }, [isOpen, initialData]);

  const canSave = useMemo(() => {
    return form.sectionHeader.trim() && form.sectionTitle.trim();
  }, [form.sectionHeader, form.sectionTitle]);

  function setItemAt(index, patch) {
    setForm((prev) => {
      const next = { ...prev };
      const items = [...next.items];
      items[index] = { ...items[index], ...patch };
      next.items = items;
      return next;
    });
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          contentTitle: '',
          description: '',
          image: null,
          imageUrl: '',
        },
      ],
    }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length ? items : prev.items };
    });
  }

  async function handleImageChange(index, file) {
    const imageUrl = file ? URL.createObjectURL(file) : '';
    setItemAt(index, { image: file, imageUrl });
  }

  async function submit() {
    if (!canSave) return;

    // Map to payload you can adapt in your builder parent.
    const payload = {
      sectionHeader: form.sectionHeader,
      sectionTitle: form.sectionTitle,
      items: form.items.map((it) => ({
        contentTitle: it.contentTitle,
        description: it.description,
        image: it.image, // File
        imageUrl: it.imageUrl,
      })),
    };

    onSave?.(payload);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/30">
      <div className="absolute right-0 top-0 h-full w-[420px] overflow-auto bg-white shadow-xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-zinc-900">Thoughtfully Chosen Materials</h3>
          <button
            className="float-right text-sm px-2 py-1 rounded border"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Section header */}
          <div>
            <label className="block text-sm font-medium text-zinc-800">Section Header</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.sectionHeader}
              onChange={(e) => setForm((p) => ({ ...p, sectionHeader: e.target.value }))}
              placeholder="e.g. Our Commitment"
            />
          </div>

          {/* Section title */}
          <div>
            <label className="block text-sm font-medium text-zinc-800">Section Title</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={form.sectionTitle}
              onChange={(e) => setForm((p) => ({ ...p, sectionTitle: e.target.value }))}
              placeholder="e.g. Thoughtfully Chosen Materials"
            />
          </div>

          {/* Repeater */}
          <div className="border rounded p-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-zinc-900">Repeater Items</h4>
                <p className="text-xs text-zinc-600">Content title, description, and image.</p>
              </div>
              <button
                className="text-sm border rounded px-3 py-1"
                onClick={addItem}
                type="button"
              >
                + Add
              </button>
            </div>

            {form.items.map((item, index) => (
              <div key={index} className="border rounded p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-zinc-900">Item {index + 1}</p>
                  <button
                    className="text-xs border rounded px-2 py-1"
                    onClick={() => removeItem(index)}
                    type="button"
                    disabled={form.items.length <= 1}
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-800">Content Title</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2"
                      value={item.contentTitle}
                      onChange={(e) => setItemAt(index, { contentTitle: e.target.value })}
                      placeholder="e.g. Thoughtful Sourcing"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-800">Description</label>
                    <textarea
                      className="mt-1 w-full border rounded px-3 py-2 min-h-[90px]"
                      value={item.description}
                      onChange={(e) => setItemAt(index, { description: e.target.value })}
                      placeholder="Short paragraph for this item"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-800">Image</label>
                    <input
                      className="mt-1 w-full"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(index, e.target.files?.[0] || null)}
                    />
                    {(item.imageUrl || item.image) && (
                      <div className="mt-2">
                        <img
                          src={item.imageUrl}
                          alt="Preview"
                          className="w-full h-[140px] object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 border rounded px-3 py-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`flex-1 rounded px-3 py-2 text-white ${canSave ? 'bg-zinc-900' : 'bg-zinc-400 cursor-not-allowed'}`}
              onClick={submit}
              disabled={!canSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

