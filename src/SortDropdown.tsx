import useStore from "./store";

export default function SortDropdown() {
  const sort = useStore((state) => state.sort);
  const setSort = useStore((state) => state.setSort);

  const SortButton = ({
    label,
    sortType
  }: {
    label: string;
    sortType: SortValues;
  }) => {
    return (
      <li>
        <button
          className={`${
            sort === sortType ? "font-bold text-primary" : ""
          } w-full`}
          onClick={() => setSort(sortType)}
        >
          {label}
        </button>
      </li>
    );
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn m-1">
        Sort Videos
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-200 rounded-box z-[1] w-52 p-2 shadow"
      >
        <SortButton label="Title" sortType="title" />
        <SortButton label="View Count" sortType="viewCount" />
        <SortButton label="Release Date" sortType="releaseDate" />
        <SortButton label="Duration" sortType="duration" />
      </ul>
    </div>
  );
}
