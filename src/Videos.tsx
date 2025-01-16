import useStore from "./store";
import Video from "./Video";

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
              <Video video={video} key={video.id} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
