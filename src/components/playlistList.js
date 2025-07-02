import { useEffect, useState } from "react";
import { UnplayableTrackList } from "./UnplayableTrackList";
import { getSession } from "next-auth/react";
import { v4 as uuidv4 } from "uuid"; // 追加
import Papa from "papaparse";

export default function PlaylistList() {
  const [unplayableTracks, setUnplayableTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlight, setHighlight] = useState(false);
  const [userTracks, setUserTracks] = useState([]);
  const [isChecking, setIsChecking] = useState(false); // 状態を管理
  const [checkingPlaylist, setcheckingPlaylist] = useState();
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
    setcheckingPlaylist(playlistId);
    const response = await fetch(
      `/api/playlist-tracks?playlistId=${playlistId}`
    );
    const data = await response.json();
    if (Array.isArray(data)) {
      setUnplayableTracks((prevTracks) => {
        const newTracks = data.map((track) => ({
          id: track.track.id,
          name: track.track.name,
          artist: track.track.artists.map((artist) => artist.name).join("."),
          album: track.track.album.name,
          url: track.track.external_urls.spotify,
          playlistId,
          isPlayable: track.track.is_playable,
          image_url: track.track.album.images?.[0]?.url ?? "",
          added_date: new Date().toISOString(),
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
    setcheckingPlaylist("");
  };

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p>エラー: {error}</p>;
  if (!playlists.length) return <p>プレイリストがありません。</p>;

  const handleFileRead = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true, // 1行目をキーとして扱う
      skipEmptyLines: true,
      complete: (result) => {
        const parsedData = result.data;
        // 整形処理（例：必要な列だけ抽出）
        const cleaned = parsedData.map((row) => ({
          id: row["id"],
          name: row["name"],
          artist: row["artist"],
          album: row["album"],
          url: row["url"],
          isPlayable: row["isPlayable"] === "true",
          image_url: row["image_url"],
          added_date: new Date(row["added_date"]),
        }));
        setUnplayableTracks(cleaned);
      },
      error: (err) => {
        console.error("CSV parse error:", err);
      },
    });
  };

  const handleDownload = () => {
    const csv = Papa.unparse(unplayableTracks); // ← 配列→CSV変換

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setUnplayableTracks([]);
  };

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
        artist: track.artist, // Supabase ARRAY 型対応
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
      <div>
        <p>read csv</p>
        <input
          type="file"
          multiple={false}
          accept=".csv"
          onChange={handleFileRead}
        />
        <div>
          {isChecking && <p>scannning all...</p>}
          {checkingPlaylist && <p>procceccing playlist ID</p>}
          {checkingPlaylist}{" "}
        </div>
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
        <h2>プレイリスト一覧</h2>
        <div>
          <button
            onClick={() => handleCheckSequentially(playlists.map((p) => p.id))}
            disabled={isChecking}
          >
            {isChecking ? "scanning all..." : "scan all"}
          </button>
        </div>
        {playlists.map((playlist) => (
          <div key={playlist.id}>
            <h3>{playlist.name}</h3>
            <button onClick={() => handleCheck(playlist.id)}>
              scan single
            </button>
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
        {unplayableTracks.length > 0 && (
          <>
            <button onClick={handleUpload}>データベースに保存</button>
            <button onClick={handleDownload}>CSVダウンロード</button>
          </>
        )}
        <UserTracks tracks={unplayableTracks} />
      </div>
      {/* <div
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
      </div> */}
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
              - {track.artist} (
              {track.added_date
                ? new Date(track.added_date).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: false, // 13:00 形式。true にすると 1:00 午後
                    month: "numeric",
                    day: "numeric",
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
