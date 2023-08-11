import { Button, Space, Spin } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";
import { postData } from "../../tools";
import { useCallback, useEffect, useState } from "react";
import { socket } from "../../socket";
import * as dayjs from "dayjs";
import { get } from "lodash";
import ReactPlayer from "react-player";

export const MainPage = () => {
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  const [players, setPlayers] = useState([]);
  const [hours, setHours] = useState(22);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    await fetch("/players");
    const response = await fetch("/time");
    const time = await response.json();
    setHours(time.response);
    setLoading(false);
  }, []);

  useEffect(() => {
    socket.connect();
    fetchData();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    user && localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    function onPlayersChange(value) {
      setPlayers(value);
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

  const playerIndex = players.findIndex(({ userId }) => get(user, "_id") === userId);
  const player = get(players, playerIndex);

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  const countdown = new Date().setHours(hours, 0, 0, 0);

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
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <div style={{ fontSize: 24, textAlign: "center" }}>
        <div style={{ fontSize: 28 }}>Start at {hours}:00</div>
        <Countdown date={countdown} />
      </div>

      <ReactPlayer url="https://www.youtube.com/watch?v=9HUdWJnTF24" />

      {user ? (
        <Space direction="vertical" align="center">
          <div>
            {user.login} | {players.length} учасників
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
              disabled={player || dayjs(countdown).diff(dayjs(), "minute") > 5}
              onClick={() => {
                postData("/participate", user).then((data) => {});
              }}
              size="middle"
              type="primary"
            >
              Register
            </Button>
          )}
        </Space>
      ) : (
        <LoginForm setUser={setUser} />
      )}
    </Space>
  );
};
