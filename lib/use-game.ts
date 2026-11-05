"use client";
import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { playerAuth, services } from "./firebase";
import type { Player, PublicGame } from "./game";
export function useGame(code: string, personal = false) {
  const [game, setGame] = useState<PublicGame | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [connected, setConnected] = useState(false);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let stopped = false;
    const cleanup: (() => void)[] = [];
    setGame(null);
    setPlayer(null);
    setLoading(true);
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setLoading(false);
      return;
    }
    playerAuth()
      .then((user) => {
        if (stopped) return;
        const { db } = services();
        const failed = (e: Error) => {
          setError(e.message);
          setLoading(false);
        };
        cleanup.push(
          onValue(
            ref(db, `games/${code}/public`),
            (snap) => {
              setGame(snap.val());
              setLoading(false);
            },
            failed,
          ),
        );
        cleanup.push(
          onValue(ref(db, ".info/connected"), (snap) =>
            setConnected(snap.val() === true),
          ),
        );
        cleanup.push(
          onValue(ref(db, ".info/serverTimeOffset"), (snap) =>
            setOffset(snap.val() || 0),
          ),
        );
        if (personal)
          cleanup.push(
            onValue(
              ref(db, `games/${code}/players/${user.uid}`),
              (snap) => setPlayer(snap.val()),
              failed,
            ),
          );
      })
      .catch((e) => {
        if (!stopped) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      stopped = true;
      cleanup.forEach((fn) => fn());
    };
  }, [code, personal]);
  return { game, player, connected, offset, error, loading };
}
export function useNow(offset = 0) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [offset]);
  return now;
}
