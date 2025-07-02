import { useEffect, useState } from "react";
import { UnplayableTrackList } from "./UnplayableTrackList";
import { getSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid"; // 追加

export default function PlaylistList() {
  const [unplayableTracks, setUnplayableTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlight, setHighlight] = useState(false);
  const [userTracks, setUserTracks] = useState([]);
  const [isChecking, setIsChecking] = useState(false); // 状態を管理

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => setPlaylists(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    console.log("現在のunplayableTracks状態:", unplayableTracks);
    if (unplayableTracks.length > 0) {
      setHighlight(true);
      setTimeout(() => setHighlight(false), 1000); // 1秒後にハイライトを解除
    }
  }, [unplayableTracks]);

  useEffect(() => {
    const fetchUserTracks = async () => {
      const response = await fetch("/api/user-tracks");
      const data = await response.json();
      if (Array.isArray(data)) {
        setUserTracks(data);
      }
    };
    fetchUserTracks();
  }, []);

  const handleCheckSequentially = async (playlistIds) => {
    setIsChecking(true); // 処理開始
    for (const playlistId of playlistIds) {
      await handleCheck(playlistId);
    }
    setIsChecking(false); // 処理終了
  };

  const handleCheck = async (playlistId) => {
    const response = await fetch(
      `/api/playlist-tracks?playlistId=${playlistId}`
    );
    const data = await response.json();
    if (Array.isArray(data)) {
      setUnplayableTracks((prevTracks) => {
        const newTracks = data.map((track) => ({
          id: track.track.id,
          name: track.track.name,
          artist: track.track.artists.map((artist) => artist.name),
          album: track.track.album.name,
          url: track.track.external_urls.spotify,
          playlistId,
          isPlayable: track.track.is_playable,
          image_url: track.track.album.images?.[0]?.url ?? "",
        }));

        // 重複を除外して追加
        const uniqueTracks = [...prevTracks, ...newTracks].filter(
          (track, index, self) =>
            index === self.findIndex((t) => t.id === track.id)
        );

        return uniqueTracks;
      });
    }
    // console.log("プレイリストのトラックデータ:", data);
  };

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;
  if (!playlists.length) return <p>プレイリストがありません。</p>;

  const handleUpload = async () => {
    const session = await getSession();
    if (!session || !session.user) {
      alert("ユーザー情報が取得できませんでした。ログインしてください。");
      return;
    }

    const registeredUrls = new Set(userTracks.map((track) => track.url));

    const tracksToUpload = unplayableTracks
      .filter((track) => !registeredUrls.has(track.url))
      .map((track) => ({
        id: uuidv4(),
        user: session.user.name,
        name: track.name,
        artist: `{${track.artist.join(",")}}`, // Supabase ARRAY 型対応
        album: track.album,
        url: track.url,
        playlistId: track.playlistId,
        isPlayable: track.isPlayable,
        image_url: track.image_url,
      }));

    if (tracksToUpload.length === 0) {
      alert("すでに登録済みのトラックです。アップロードをスキップします。");
      return;
    }

    const response = await fetch("/api/upload-tracks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tracks: tracksToUpload }),
    });

    if (response.ok) {
      console.log("データベースに登録されました。");

      try {
        const updatedTracks = await fetch("/api/user-tracks").then((res) =>
          res.json()
        );
        setUserTracks(updatedTracks);
      } catch (error) {
        console.error("登録後のデータ取得に失敗しました:", error);
      }

      setUnplayableTracks([]);
    } else {
      console.error("登録に失敗しました。", await response.text());
    }
    console.log("送信データ:", JSON.stringify(tracksToUpload, null, 2));
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "80vh",
          border: "1px solid #ccc",
          padding: "10px",
        }}
      >
        <h2>プレイリスト一覧</h2>
        <div>
          <button
            onClick={() => handleCheckSequentially(playlists.map((p) => p.id))}
            disabled={isChecking}
          >
            {isChecking ? "チェック中..." : "すべてチェック"}
          </button>
          {isChecking && <p>処理中です。しばらくお待ちください...</p>}
        </div>
        {playlists.map((playlist) => (
          <div key={playlist.id}>
            <h3>{playlist.name}</h3>
            <button onClick={() => handleCheck(playlist.id)}>チェック</button>
          </div>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "80vh",
          border: "1px solid #ccc",
          padding: "10px",
        }}
      >
        <UserTracks tracks={userTracks} />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "80vh",
          border: "1px solid #ccc",
          padding: "10px",
          transition: "background-color 0.5s ease",
          backgroundColor: highlight ? "#000080" : "transparent",
        }}
      >
        <UnplayableTrackList tracks={unplayableTracks} />
        {unplayableTracks.length > 0 && (
          <button onClick={handleUpload}>データベースに保存</button>
        )}
      </div>
    </div>
  );
}

function UserTracks({ tracks }) {
  const sortedTracks = [...tracks].sort(
    (a, b) =>
      new Date(b.createdAt ?? Date.now()) - new Date(a.createdAt ?? Date.now())
  );

  return (
    <div>
      <h2>保存済み</h2>
      {sortedTracks.length === 0 ? (
        <p>保存無し。</p>
      ) : (
        <ul>
          {sortedTracks.map((track) => (
            <li
              key={track.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              {track.image_url && (
                <a href={track.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={track.image_url}
                    alt={track.name}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                      borderRadius: "5px",
                    }}
                  />
                </a>
              )}
              <a
                href={track.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: "none",
                  color: "blue",
                  fontWeight: "bold",
                }}
              >
                {track.name}{" "}
                <font size="2" color="white">
                  open in
                </font>
                <img
                  src="https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_White.png"
                  style={{ height: "1em", verticalAlign: "middle" }}
                />
              </a>{" "}
              - {track.artist.join(", ")} (
              {track.createdAt
                ? new Date(track.createdAt).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })
                : "N/A"}
              )
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
