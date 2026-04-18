import { useState } from "react";
import useStore from "../helpers/store";
import {
  addVideosToPlaylistAPI,
  deleteVideosFromPlaylistAPI,
} from "../helpers/youtubeAPI/videoAPI";

type Props = {
  selectedVideoResourceIds: string[];
  selectedVideoItemIds?: string[];
  sourcePlaylistId?: string;
  onComplete: () => void;
};

export default function MoveDropdown({
  selectedVideoResourceIds,
  selectedVideoItemIds,
  sourcePlaylistId,
  onComplete,
}: Props) {
  const [loading, setLoading] = useState(false);
  const playlists = useStore((state) => state.playlists);
  const setPlaylists = useStore((state) => state.setPlaylists);
  const accessToken = useStore((state) => state.accessToken);

  const filteredPlaylists = playlists.filter(
    (playlist) => playlist.id !== sourcePlaylistId
  );

  const handleMove = async (playlistId: string) => {
    if (!accessToken) return;

    setLoading(true);
    const toRemove = selectedVideoItemIds ?? [];

    await Promise.all([
      addVideosToPlaylistAPI(accessToken, selectedVideoResourceIds, playlistId),
      toRemove.length > 0
        ? deleteVideosFromPlaylistAPI(accessToken, toRemove)
        : Promise.resolve(),
    ]);

    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          videoCount: playlist.videoCount + selectedVideoResourceIds.length,
        };
      }
      if (sourcePlaylistId && playlist.id === sourcePlaylistId) {
        return {
          ...playlist,
          videoCount: playlist.videoCount - toRemove.length,
        };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);

    setLoading(false);
    onComplete();
  };

  return (
    <div className="relative">
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="loading loading-spinner text-white"></div>
        </div>
      )}
      <div className="dropdown dropdown-end">
        <div tabIndex={0} role="button" className="btn btn-sm md:btn-md btn-neutral">
          Move To
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-200 rounded-box z-[1] w-52 p-2 shadow"
        >
          {filteredPlaylists.map((playlist) => (
            <li key={playlist.id}>
              <button onClick={() => handleMove(playlist.id)}>
                {playlist.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
