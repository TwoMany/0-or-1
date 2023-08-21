import { Button, Space, Spin } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";
import { postData } from "../../tools";
import { useCallback, useEffect, useState } from "react";
import { socket } from "../../socket";
import * as dayjs from "dayjs";
import { get, isEqual } from "lodash";
import ReactPlayer from "react-player";

export const MainPage = () => {
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  const [players, setPlayers] = useState([]);
  const [hours, setHours] = useState(22);
  const [minutes, setMinutes] = useState(0);
  const [countdown, setCountdown] = useState();
  const [loading, setLoading] = useState(false);

  const fetchPlayers = useCallback(async () => {
    const response = await fetch(process.env.REACT_APP_ENVIRONMENT === 'production' ? "https://server.illusiumgame.com/players" : 'http://localhost:9000/players', {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      mode: process.env.REACT_APP_ENVIRONMENT === 'production' ? "cors" : undefined, // no-cors, *cors, same-origin
    });
    const players = await response.json();
    setPlayers(players.response);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    const response = await fetch(process.env.REACT_APP_ENVIRONMENT === 'production' ? "https://server.illusiumgame.com/time" : 'http://localhost:9000/time', {
      method: "GET", // *GET, POST, PUT, DELETE, etc.
      mode: process.env.REACT_APP_ENVIRONMENT === 'production' ? "cors" : undefined, // no-cors, *cors, same-origin
    })
    const time = await response.json();
    setHours(time.gameStartHour);
    setMinutes(time.gameStartMinutes);
    setCountdown(new Date().setHours(time.gameStartHour, time.gameStartMinutes, 0, 0));
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPlayers();
    fetchData();
  }, []);

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    function onPlayersChange(value) {
      if (!isEqual(players, value)) setPlayers(value);
    }
    socket.on("players", onPlayersChange);
    return () => {
      socket.off("players", onPlayersChange);
    };
  }, [players]);

  const handleSendAnswer = useCallback(
    (answer) => {
      postData("/answer", { answer, userId: get(user, "_id") }).then((data) => {
        console.log(data);
      });
    },
    [user]
  );

  const playerIndex = (players || []).findIndex(({ userId }) => get(user, "_id") === userId);
  const player = get(players, playerIndex);

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  return loading ? (
    <div
      style={{
        margin: "20px 0",
        marginBottom: 20,
        padding: "30px 50px",
        textAlign: "center",
      }}
    >
      <Spin />
    </div>
  ) : (
    <Space direction="vertical" align="center" style={{ width: "100%", fontSize: 18 }}>
      <div style={{ fontSize: 24, textAlign: "center" }}>
        <div style={{ fontSize: 28 }}>Початок о {hours}:{minutes}</div>
        {countdown && <Countdown
          overtime={Boolean(get(players, "length"))}
          date={
            dayjs(countdown).diff(dayjs()) <= 0 && get(players, "length")
              ? dayjs().startOf("minute").valueOf() + 60000
              : countdown
          }
          onComplete={() => {
            fetchPlayers();
          }}
        />}
      </div>

      {Boolean(get(players, "length")) && <ReactPlayer url="https://www.youtube.com/watch?v=9HUdWJnTF24" />}

      {user ? (
        <Space direction="vertical" align="center">
          <div>
            {user.login} | {get(players, "length")} учасників
          </div>
          {dayjs(countdown).diff(dayjs()) <= 0 && player && oponent ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", minWidth: 280, gap: 24 }}>
                <div>
                  {player.name} ({oponent.answer !== null && player.answer !== null ? player.answer : "?"}){" "}
                  {playerIndex % 2 === 0 ? "загадує" : "розгадує"}
                </div>
                <div>
                  {oponent.name} ({oponent.answer !== null && player.answer !== null ? oponent.answer : "?"}){" "}
                  {oponentIndex % 2 === 0 ? "загадує" : "розгадує"}
                </div>
              </div>
              {!get(players, `[${playerIndex}].answer`) && (
                <Space.Compact block>
                  <Button onClick={() => handleSendAnswer(0)}>0</Button>
                  <Button onClick={() => handleSendAnswer(1)}>1</Button>
                </Space.Compact>
              )}
            </>
          ) : (
            <Button
              disabled={
                player || dayjs(countdown).diff(dayjs(), "minute") > 5 || dayjs(countdown).diff(dayjs(), "minute") < 0
              }
              onClick={() => {
                postData("/participate", user).then((data) => {});
              }}
              size="large"
              type="primary"
            >
              Прийняти участь
            </Button>
          )}
        </Space>
      ) : (
        <LoginForm setUser={setUser} />
      )}
    </Space>
  );
};
