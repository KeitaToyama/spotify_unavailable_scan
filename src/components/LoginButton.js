import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
  const { data: session } = useSession();

  return (
    <div>
      {session ? (
        <>
          <p>ログイン中: {session.user.name}</p>
          <button onClick={() => signOut()}>ログアウト</button>
        </>
      ) : (
        <button onClick={() => signIn("spotify")}>Spotifyでログイン</button>
      )}
    </div>
  );
}
