import { Button, Space } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";
import { postData } from "../../tools";
import { useCallback, useEffect, useState } from "react";
import { socket } from "../../socket";

import { get } from "lodash";

export const MainPage = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  const [players, setPlayers] = useState([]);

  const fetchData = async () => await fetch("/players");

  useEffect(() => {
    user && localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    function onConnect(value) {
      setIsConnected(true);
      // console.log(value);
    }

    function onDisconnect(value) {
      setIsConnected(false);
      // console.log(value);
    }

    function onPlayersChange(value) {
      console.log(value);
      setPlayers(value);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("players", onPlayersChange);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("players", onPlayersChange);
    };
  }, []);

  const handleSendAnswer = useCallback(
    (answer) => {
      postData("/answer", { answer, userId: user._id }).then((data) => {
        console.log(data);
      });
    },
    [user]
  );

  const playerIndex = players.findIndex(({ userId }) => user._id === userId);
  const player = get(players, playerIndex);

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  console.log("room", player, players);

  return (
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <div>Start at 21:00</div>
      <Countdown date={new Date().setHours(21, 0, 0, 0)} />

      {user ? (
        <Space direction="vertical" align="center">
          <div>
            {user.login}, {players.length}
          </div>
          {player && oponent ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", minWidth: 120 }}>
                <div>
                  {player.name} ({oponent.answer !== null && player.answer !== null ? player.answer : "?"}){" "}
                  {playerIndex % 2 === 0 ? "загадую" : "розгадую"}
                </div>
                <div>
                  {oponent.name} ({oponent.answer !== null && player.answer !== null ? oponent.answer : "?"}){" "}
                  {oponentIndex % 2 === 0 ? "загадую" : "розгадую"}
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
              disabled={players.length === 1}
              onClick={() => {
                postData("/participate", user).then((data) => {});
              }}
              size="large"
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
