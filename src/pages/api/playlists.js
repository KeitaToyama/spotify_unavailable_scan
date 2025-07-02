import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session || !session.user.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    let playlists = [];
    let nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50";

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch playlists");
      }

      playlists = [...playlists, ...data.items];
      nextUrl = data.next;
    }

    // 自分が作成したプレイリストのみをフィルタリング
    const userPlaylists = playlists.filter(
      (playlist) => playlist.owner.id === session.user.id
    );

    res.status(200).json(userPlaylists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
