interface AddCategoryToolbarProps {
  saving: boolean;
  addCategoryOpen: boolean;
  setAddCategoryOpen: (open: boolean) => void;
  setBulkImportOpen: (open: boolean) => void;
  addCategory: (name: string) => Promise<void>;
}

export function AddCategoryToolbar({
  saving,
  addCategoryOpen,
  setAddCategoryOpen,
  setBulkImportOpen,
  addCategory,
}: AddCategoryToolbarProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="sm:hidden">
        {!addCategoryOpen ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={saving}
              onClick={() => setAddCategoryOpen(true)}
            >
              + Add category
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              disabled={saving}
              onClick={() => setBulkImportOpen(true)}
            >
              ⬆ Bulk import from text
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-2 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              const name = (formData.get("name") as string) ?? "";
              void addCategory(name);
              form.reset();
              setAddCategoryOpen(false);
            }}
          >
            <input
              name="name"
              autoFocus
              className="min-h-[44px] w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="New category name"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-[44px] flex-1 touch-manipulation rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
                onClick={() => setAddCategoryOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[44px] flex-1 touch-manipulation rounded-full bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={saving}
              >
                Add
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="hidden sm:block">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Add category
        </h2>
        <form
          className="flex flex-col gap-2 text-xs sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            const name = (formData.get("name") as string) ?? "";
            void addCategory(name);
            form.reset();
          }}
        >
          <input
            name="name"
            className="min-h-[44px] flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400"
            placeholder="New category name"
          />
          <button
            type="submit"
            className="min-h-[44px] touch-manipulation rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={saving}
          >
            Add category
          </button>
          <button
            type="button"
            className="min-h-[44px] touch-manipulation rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            disabled={saving}
            onClick={() => setBulkImportOpen(true)}
          >
            ⬆ Bulk import
          </button>
        </form>
      </div>
    </section>
  );
}
