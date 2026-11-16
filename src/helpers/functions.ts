export const convertDurationToSeconds = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) {
    return 0;
  }

  const hours = parseInt((match[1] || "0H").slice(0, -1), 10);
  const minutes = parseInt((match[2] || "0M").slice(0, -1), 10);
  const seconds = parseInt((match[3] || "0S").slice(0, -1), 10);

  return hours * 3600 + minutes * 60 + seconds;
};

export const convertDurationToTimeString = (
  durationSeconds: number
): string => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
};

export function convertReleaseDateToTimeSinceRelease(
  releaseDate: string
): string {
  const releaseDateDate = new Date(releaseDate);
  const now = new Date();
  const diff = now.getTime() - releaseDateDate.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (hours < 24) {
    return `${hours} hours ago`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (weeks < 4) {
    return `${weeks} weeks ago`;
  } else if (months < 12) {
    return `${months} months ago`;
  } else {
    return `${years} years ago`;
  }
}

export const formatTotalDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
};

// Returns a new array; never mutates. Missing/NaN fields sort last instead of
// poisoning the comparator (a NaN result makes Array.sort order undefined).
export const sortVideos = <T extends Partial<Video>>(
  videos: T[],
  sort: SortValues
): T[] => {
  const num = (n: number | undefined) => (Number.isFinite(n) ? (n as number) : -1);
  const str = (s: string | undefined) => s ?? "";
  return [...videos].sort((a, b) => {
    switch (sort) {
      case "title":
        return str(a.title).localeCompare(str(b.title));
      case "viewCount":
        return num(b.viewCount) - num(a.viewCount);
      case "releaseDate":
        return str(b.releaseDate).localeCompare(str(a.releaseDate));
      case "dateAdded":
        return str(b.dateAdded).localeCompare(str(a.dateAdded));
      case "duration":
        return num(b.durationSeconds) - num(a.durationSeconds);
      default:
        return 0;
    }
  });
};
