import { ReactNode } from "react";
import useStore from "../helpers/store";
import SortDropdown from "./SortDropdown";

type Props = {
  // Left side of the header: title, badges, search form, etc.
  children: ReactNode;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete?: () => void;
  // Bulk actions (Move To / Copy To) shown in the selection bar.
  selectionActions?: ReactNode;
  hideSort?: boolean;
  // False hides the view controls entirely (e.g. no results yet).
  showActions?: boolean;
};

// Header for any video list. Layout adapts to the width of the pane it's in
// (not the viewport), so it stays tidy when the video viewer takes half the
// screen:
//  - Row 1: title content on the left, compact view controls on the right.
//    The title has a minimum basis, so the controls wrap below it instead of
//    squeezing it when the pane is narrow.
//  - Row 2 (only while something is selected): a contextual selection bar
//    holding the bulk actions, so they never compete with the title for space.
export default function ListHeader({
  children,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  selectionActions,
  hideSort,
  showActions = true,
}: Props) {
  const gridView = useStore((state) => state.gridView);
  const setGridView = useStore((state) => state.setGridView);

  const hasSelection = showActions && selectedCount > 0;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3 min-w-0 flex-[1_1_16rem]">
          {children}
        </div>
        {showActions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {!hasSelection && (
              <button className="btn btn-sm btn-neutral" onClick={onSelectAll}>
                Select All
              </button>
            )}
            {!hideSort && <SortDropdown />}
            <button
              className={`btn btn-sm btn-square ${gridView ? "btn-primary" : "btn-neutral"}`}
              onClick={() => setGridView(!gridView)}
              title={gridView ? "List view" : "Grid view"}
              aria-label={gridView ? "Switch to list view" : "Switch to grid view"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm0 8h6v6h-6v-6z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2 rounded-box bg-base-200 px-2 py-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              className="btn btn-ghost btn-sm btn-square"
              onClick={onDeselectAll}
              title="Clear selection"
              aria-label="Clear selection"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <span className="text-sm font-semibold whitespace-nowrap">
              {selectedCount} selected
            </span>
            {!allSelected && (
              <button
                className="btn btn-link btn-sm px-2 no-underline hover:underline"
                onClick={onSelectAll}
              >
                Select all {totalCount}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {selectionActions}
            {onDelete && (
              <button className="btn btn-sm btn-error" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
