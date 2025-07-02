export function UnplayableTrackList({ tracks }) {
  //   console.log(tracks);
  return (
    <div>
      <h2>保存待ち:{tracks.length}</h2>
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            {track.name} - {track.artist}
          </li>
        ))}
      </ul>
    </div>
  );
}
