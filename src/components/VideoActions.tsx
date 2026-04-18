import { ReactNode } from "react";
import useStore from "../helpers/store";
import SortDropdown from "./SortDropdown";

type Props = {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete?: () => void;
  moveDropdown?: ReactNode;
};

export default function VideoActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  moveDropdown,
}: Props) {
  const gridView = useStore((state) => state.gridView);
  const setGridView = useStore((state) => state.setGridView);

  return (
    <div className="flex flex-row flex-wrap gap-2 md:gap-4">
      {selectedCount > 0 && moveDropdown}
      {totalCount !== selectedCount && (
        <button className="btn btn-sm md:btn-md btn-neutral" onClick={onSelectAll}>
          Select All
        </button>
      )}
      {selectedCount > 0 && (
        <button className="btn btn-sm md:btn-md btn-neutral" onClick={onDeselectAll}>
          Deselect All
        </button>
      )}
      {selectedCount > 0 && onDelete && (
        <button className="btn btn-sm md:btn-md btn-error" onClick={onDelete}>
          Delete ({selectedCount})
        </button>
      )}
      {selectedCount === 0 && <SortDropdown />}
      {selectedCount === 0 && (
        <button
          className={`btn btn-sm md:btn-md btn-square ${gridView ? "btn-primary" : "btn-neutral"}`}
          onClick={() => setGridView(!gridView)}
          title={gridView ? "List view" : "Grid view"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M3 3h6v6H3V3zm0 8h6v6H3v-6zm8-8h6v6h-6V3zm0 8h6v6h-6v-6z" />
          </svg>
        </button>
      )}
    </div>
  );
}
