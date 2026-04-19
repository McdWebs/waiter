import type { PendingDelete } from "./types";

interface DeleteConfirmModalProps {
  pendingDelete: PendingDelete;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({
  pendingDelete,
  saving,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl my-auto">
        <h2 className="text-sm font-semibold text-slate-900">Confirm delete</h2>
        <p className="mt-2 text-xs text-slate-700">
          {pendingDelete.type === "category"
            ? `Delete category "${pendingDelete.name}" and all its items?`
            : `Delete item "${pendingDelete.name}"?`}
        </p>
        <div className="mt-4 flex justify-end gap-2 text-xs">
          <button
            type="button"
            className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="min-h-[44px] touch-manipulation rounded-full bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
            disabled={saving}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
