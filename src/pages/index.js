import Head from "next/head";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import LoginButton from "@/components/LoginButton";
import PlaylistList from "@/components/playlistList";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <>
      <LoginButton />
      <PlaylistList />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "blue",
            textDecoration: "underline",
          }}
        >
          <Link href={"/termsen"}>end user agreement(EN)</Link>

          <Link href={"/termsjp"}>利用規約(日本語)</Link>
          <Link href={"/privacyen"}>privacy policy (EN)</Link>
          <Link href={"/privacyjp"}>プライバシーポリシー(日本語)</Link>
        </div>
        <div>
          Powered by{" "}
          <a href="https://www.spotify.com/jp/premium/">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8uU7k5jsTvGoHVHyuWfXlRVs9agVeIN2CSQ&s"
              style={{ height: "5em", verticalAlign: "middle" }}
            />
          </a>
        </div>
      </div>
    </>
  );
}
