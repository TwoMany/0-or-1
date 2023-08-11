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

  useEffect(() => {
    user && localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

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

  const playerIndex = players.findIndex(({userId}) => user._id === userId);

  console.log('room', user, players);

  return (
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <div>Start at 21:00</div>
      <Countdown date={new Date().setHours(21, 0, 0, 0)} />

      {user ? (
        <Space direction="vertical" align="center">
          <div>{user.login}</div>
          {playerIndex >= 0 ? (
            <>
              <div>
                <Space>
                  {get(players, `[${playerIndex}].name`)} {get(players, `[${playerIndex}].answer`)}
                </Space>
                <Space>
                  {get(players, `[${playerIndex + 1}].name`)} {get(players, `[${playerIndex + 1}].answer`)}
                </Space>
              </div>
              {!get(players, `[${playerIndex + 1}].answer`) && (
                <Space.Compact block>
                  <Button onClick={() => handleSendAnswer(0)}>0</Button>
                  <Button onClick={() => handleSendAnswer(1)}>1</Button>
                </Space.Compact>
              )}
            </>
          ) : (
            <Button
              onClick={() => {
                postData("/participate", user).then((data) => {
                  
                });
              }}
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
