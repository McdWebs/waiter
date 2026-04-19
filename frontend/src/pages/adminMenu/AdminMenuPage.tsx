import { getCurrencySymbol } from "./currency";
import { useAdminMenuPage } from "./useAdminMenuPage";
import { AddCategoryToolbar } from "./AddCategoryToolbar";
import { BusinessPlansPanel } from "./BusinessPlansPanel";
import { AdminMenuCategoriesSection } from "./AdminMenuCategoriesSection";
import { BulkImportModal } from "./BulkImportModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { AddItemModal } from "./AddItemModal";
import { EditItemModal } from "./EditItemModal";
import { BusinessPlanEditor } from "./BusinessPlanEditor";
import type { BulkCategory } from "./bulkMenu";

export default function AdminMenuPage() {
  const vm = useAdminMenuPage();

  if (vm.loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
          <p className="text-sm text-slate-600">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (vm.error || !vm.data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
          <h1 className="text-lg font-semibold">Admin</h1>
          <p className="mt-2 text-sm text-rose-600">
            {vm.error ?? "Failed to load restaurant menu."}
          </p>
        </div>
      </div>
    );
  }

  const data = vm.data;
  const currencySymbol = getCurrencySymbol(data.restaurant.currency);

  const handleBulkImport = (parsed: BulkCategory[]) => {
    void vm.bulkImport(parsed);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 pb-8"
      onClick={() => vm.setOpenActionsItemId(null)}
    >
      <div className="mx-auto max-w-3xl px-3 py-4 space-y-6 sm:px-4 sm:py-6">
        <AddCategoryToolbar
          saving={vm.saving}
          addCategoryOpen={vm.addCategoryOpen}
          setAddCategoryOpen={vm.setAddCategoryOpen}
          setBulkImportOpen={vm.setBulkImportOpen}
          addCategory={vm.addCategory}
        />

        <BusinessPlansPanel
          data={data}
          currencySymbol={currencySymbol}
          planSaving={vm.planSaving}
          setEditingPlan={vm.setEditingPlan}
          deleteBusinessPlan={vm.deleteBusinessPlan}
        />

        <AdminMenuCategoriesSection
          data={data}
          setData={vm.setData}
          saving={vm.saving}
          collapsedCategoryIds={vm.collapsedCategoryIds}
          dragCategoryIndex={vm.dragCategoryIndex}
          setDragCategoryIndex={vm.setDragCategoryIndex}
          dragItemState={vm.dragItemState}
          setDragItemState={vm.setDragItemState}
          editingCategoryId={vm.editingCategoryId}
          editingCategoryName={vm.editingCategoryName}
          setEditingCategoryId={vm.setEditingCategoryId}
          setEditingCategoryName={vm.setEditingCategoryName}
          openActionsItemId={vm.openActionsItemId}
          setOpenActionsItemId={vm.setOpenActionsItemId}
          currencySymbol={currencySymbol}
          reorderCategories={vm.reorderCategories}
          reorderItems={vm.reorderItems}
          updateCategoryName={vm.updateCategoryName}
          handleAutoScroll={vm.handleAutoScroll}
          toggleCategoryCollapsed={vm.toggleCategoryCollapsed}
          setAddingItemForCategory={vm.setAddingItemForCategory}
          setPendingDelete={vm.setPendingDelete}
          setEditingItem={vm.setEditingItem}
          patchItemAvailable={vm.patchItemAvailable}
        />

        <BulkImportModal
          open={vm.bulkImportOpen}
          bulkImportText={vm.bulkImportText}
          setBulkImportText={vm.setBulkImportText}
          bulkImportProgress={vm.bulkImportProgress}
          saving={vm.saving}
          currencySymbol={currencySymbol}
          onClose={() => {
            vm.setBulkImportOpen(false);
            vm.setBulkImportText("");
            vm.setBulkImportProgress(null);
          }}
          onImport={handleBulkImport}
        />

        {vm.pendingDelete && (
          <DeleteConfirmModal
            pendingDelete={vm.pendingDelete}
            saving={vm.saving}
            onCancel={() => vm.setPendingDelete(null)}
            onConfirm={() => {
              const pd = vm.pendingDelete;
              if (!pd) return;
              if (pd.type === "category") {
                void vm.deleteCategory(pd.id);
              } else {
                void vm.deleteItem(pd.id);
              }
              vm.setPendingDelete(null);
            }}
          />
        )}

        {vm.addingItemForCategory && (
          <AddItemModal
            categoryName={vm.addingItemForCategory.name}
            saving={vm.saving}
            newItemImagePreview={vm.newItemImagePreview}
            setNewItemImagePreview={vm.setNewItemImagePreview}
            onClose={() => vm.setAddingItemForCategory(null)}
            onSubmit={async (formData) => {
              const cat = vm.addingItemForCategory;
              if (!cat) return;
              const ok = await vm.addItem(cat._id, formData);
              if (ok) {
                vm.setNewItemImagePreview(null);
                vm.setAddingItemForCategory(null);
              }
            }}
          />
        )}

        {vm.editingItem && (
          <EditItemModal
            item={vm.editingItem.item}
            saving={vm.saving}
            editItemImagePreview={vm.editItemImagePreview}
            setEditItemImagePreview={vm.setEditItemImagePreview}
            onClose={() => vm.setEditingItem(null)}
            onSubmit={async (formData) => {
              await vm.updateItemDetails(vm.editingItem!.item._id, formData);
              vm.setEditItemImagePreview(null);
              vm.setEditingItem(null);
            }}
          />
        )}

        {vm.editingPlan && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 py-6 overflow-y-auto overscroll-contain sm:items-center">
            <div className="my-4 w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-3xl bg-white px-5 py-4 shadow-xl sm:my-0 sm:px-6 sm:py-5">
              <h2 className="text-base font-semibold text-slate-900">
                {vm.editingPlan._id
                  ? "Edit business plan"
                  : "New business plan"}
              </h2>
              <p className="mt-1 text-[11px] text-slate-600">
                Choose a name, price, and which dishes are included in this
                עסקית.
              </p>
              <BusinessPlanEditor
                plan={vm.editingPlan}
                categories={data.categories}
                currencySymbol={currencySymbol}
                saving={vm.planSaving}
                onCancel={() => vm.setEditingPlan(null)}
                onSave={vm.upsertBusinessPlan}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
