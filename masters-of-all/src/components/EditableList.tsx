import React, { useState } from 'react';
import { ListOrdered, Plus, Trash2, ArrowUp, ArrowDown, X, Check } from 'lucide-react';

export interface EditableListField {
  key: string;
  label: string;
  multiline?: boolean;
  isStringArray?: boolean;
}

interface EditableListProps<T extends object> {
  items: T[];
  label: string;
  fields: EditableListField[];
  isEditMode: boolean;
  createEmptyItem: (index: number) => T;
  onUpdateItems: (nextItems: T[]) => void;
  children: React.ReactNode;
}

export function EditableList<T extends object>({
  items,
  label,
  fields,
  isEditMode,
  createEmptyItem,
  onUpdateItems,
  children
}: EditableListProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<T[]>(items);

  if (!isEditMode) {
    return <>{children}</>;
  }

  const openModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftItems(items.map(i => ({ ...i })));
    setIsOpen(true);
  };

  const updateItemField = (idx: number, key: string, value: unknown) => {
    setDraftItems(prev => prev.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= draftItems.length) return;
    setDraftItems(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, moved);
      return copy;
    });
  };

  const removeItem = (idx: number) => {
    setDraftItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setDraftItems(prev => [...prev, createEmptyItem(prev.length)]);
  };

  const handleSave = () => {
    onUpdateItems(draftItems);
    setIsOpen(false);
  };

  return (
    <div className="relative group/editlist">
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={openModal}
          className="px-3.5 py-1.5 rounded-xl bg-[#031D1C] border border-[#25CDB6]/50 text-[#25CDB6] hover:bg-[#17A491]/20 text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer"
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Edit {label} ({items.length})</span>
        </button>
      </div>

      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${label}`}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#031D1C] border border-[#25CDB6]/50 rounded-3xl shadow-2xl overflow-hidden text-[#EDE9E0]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold">Edit {label}</h3>
                <p className="text-xs text-[#EDE9E0]/55">Add, edit, reorder, or remove items.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {draftItems.map((item, idx) => {
                const record = item as Record<string, unknown>;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#06302F]/80 border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#25CDB6]">
                        Item #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Move item up"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(idx, 1)}
                          disabled={idx === draftItems.length - 1}
                          aria-label="Move item down"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          aria-label="Remove item"
                          className="p-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/60 hover:border-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fields.map(f => {
                        const rawVal = record[f.key];
                        const strVal = f.isStringArray
                          ? (Array.isArray(rawVal) ? rawVal.join(', ') : '')
                          : String(rawVal ?? '');
                        return (
                          <div
                            key={f.key}
                            className={f.multiline || f.isStringArray ? 'sm:col-span-2' : ''}
                          >
                            <label className="text-[11px] font-semibold text-[#EDE9E0]/70 block mb-1">
                              {f.label}
                              {f.isStringArray ? ' (comma-separated)' : ''}
                            </label>
                            {f.multiline ? (
                              <textarea
                                rows={2}
                                value={strVal}
                                onChange={e => updateItemField(idx, f.key, e.target.value)}
                                className="w-full bg-[#031D1C] border border-white/15 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                              />
                            ) : (
                              <input
                                type="text"
                                value={strVal}
                                onChange={e =>
                                  updateItemField(
                                    idx,
                                    f.key,
                                    f.isStringArray
                                      ? e.target.value
                                          .split(',')
                                          .map(s => s.trim())
                                          .filter(Boolean)
                                      : e.target.value
                                  )
                                }
                                className="w-full bg-[#031D1C] border border-white/15 rounded-xl px-3 py-2 text-xs text-[#EDE9E0] focus:border-[#25CDB6] focus:outline-none"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addItem}
                className="w-full py-2.5 rounded-2xl border border-dashed border-[#25CDB6]/40 text-[#25CDB6] hover:bg-[#17A491]/10 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add {label} Item</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#EDE9E0]/70 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#17A491] hover:bg-[#25CDB6] text-[#031D1C] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
