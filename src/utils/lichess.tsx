import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { appDataDir, resolve } from "@tauri-apps/api/path";
import { Color } from "chessground/types";
import { invoke } from "./misc";
const base_url = "https://lichess.org/api";
const explorer_url = "https://explorer.lichess.ovh";

type LichessPerf = {
  games: number;
  rating: number;
  rd: number;
  prog: number;
  prov: boolean;
};

export type LichessAccount = {
  id: string;
  username: string;
  perfs: {
    chess960: LichessPerf;
    atomic: LichessPerf;
    racingKings: LichessPerf;
    ultraBullet: LichessPerf;
    blitz: LichessPerf;
    kingOfTheHill: LichessPerf;
    bullet: LichessPerf;
    correspondence: LichessPerf;
    horde: LichessPerf;
    puzzle: LichessPerf;
    classical: LichessPerf;
    rapid: LichessPerf;
    storm: {
      runs: number;
      score: number;
    };
  };
  createdAt: number;
  disabled: boolean;
  tosViolation: boolean;
  profile: {
    country: string;
    location: string;
    bio: string;
    firstName: string;
    lastName: string;
    fideRating: number;
    uscfRating: number;
    ecfRating: number;
    links: string;
  };
  seenAt: number;
  patron: boolean;
  verified: boolean;
  playTime: {
    total: number;
    tv: number;
  };
  title: string;
  url: string;
  playing: string;
  completionRate: number;
  count: {
    all: number;
    rated: number;
    ai: number;
    draw: number;
    drawH: number;
    loss: number;
    lossH: number;
    win: number;
    winH: number;
    bookmark: number;
    playing: number;
    import: number;
    me: number;
  };
  streaming: boolean;
  followable: boolean;
  following: boolean;
  blocking: boolean;
  followsYou: boolean;
};

function base64URLEncode(str: ArrayBuffer) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function createCodes() {
  const verifier = base64URLEncode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64URLEncode(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  );
  return { verifier, challenge };
}

async function getJson(url: string) {
  const response = await fetch(url);
  return await response.json();
}

export async function getLichessAccount({
  token,
  username,
}: {
  token?: string;
  username?: string;
}) {
  let response: Response;
  if (token) {
    const url = `${base_url}/account`;
    const options = { headers: { Authorization: `Bearer ${token}` } };
    response = await fetch(url, options);
  } else {
    const url = `${base_url}/user/${username}`;
    response = await fetch(url);
  }
  if (!response.ok) {
    notifications.show({
      title: "Failed to fetch Lichess account",
      message: 'Could not find account "' + username + '" on lichess.org',
      color: "red",
      icon: <IconX />,
    });
    return null;
  }
  return (await response!.json()) as LichessAccount;
}

export async function getCloudEvaluation(fen: string, multipv: number = 1) {
  const url = `${base_url}/cloud-eval?fen=${fen}&multipv=${multipv}`;
  return getJson(url);
}

export async function getGames(fen: string) {
  const url = `${explorer_url}/lichess?fen=${fen}`;
  return getJson(url);
}

export async function getMasterGames(fen: string) {
  const url = `${explorer_url}/masters?fen=${fen}`;
  return getJson(url);
}

export async function getPlayerGames(
  fen: string,
  player: string,
  color: Color
) {
  const url = `${explorer_url}/player?fen=${fen}&player=${player}&color=${color}`;
  return getJson(url);
}

export async function downloadLichess(
  player: string,
  timestamp: number | null,
  token?: string
) {
  let url = `${base_url}/games/user/${player}`;
  if (timestamp) {
    url += `?since=${timestamp}`;
  }
  const path = await resolve(await appDataDir(), "db", player + "_lichess.pgn");
  await invoke("download_file", {
    id: 1,
    url,
    zip: false,
    path,
    token,
  });
}

export async function getLichessGame(gameId: string) {
  const apiData = await fetch(`https://lichess.org/game/export/${gameId}`);
  const pgn = await apiData.text();
  return pgn;
}