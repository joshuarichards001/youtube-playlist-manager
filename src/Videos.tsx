import useStore from "./store";

type Props = {
  playlistName: string;
};

export default function Videos({ playlistName }: Props) {
  const videos = useStore((state) => state.videos);

  return (
    <>
      {videos.length > 0 && (
        <div>
          <h2 className="font-bold text-xl mb-4">{playlistName}</h2>
          <ul className="flex flex-col">
            {videos.map((video) => (
              <li
                className="flex flex-row cursor-move hover:bg-base-200 p-2 rounded-lg justify-between items-center w-full"
                key={video.id}
                draggable
              >
                <div className="flex flex-row">
                  <img
                    className="rounded-md h-20"
                    src={video.snippet.thumbnails.default.url}
                    alt={video.snippet.title}
                  />
                  <div className="flex flex-col pl-2 gap-2">
                    <p>{video.snippet.title}</p>
                    <p className="text-xs text-base-content/70">
                      {video.snippet.videoOwnerChannelTitle}
                    </p>
                  </div>
                </div>
                <input type="checkbox" className="checkbox checkbox-lg mr-6" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
