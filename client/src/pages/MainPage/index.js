import { Button, Space } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";
import { postData } from "../../tools";
import { useEffect, useState } from "react";
import { socket } from "../../socket";

import { get } from "lodash";

export const MainPage = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    user && localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    function onConnect(value) {
      setIsConnected(true);
      console.log(value);
    }

    function onDisconnect(value) {
      setIsConnected(false);
      console.log(value);
    }

    function onFooEvent(value) {
      console.log(value);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameArray', onFooEvent);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameArray', onFooEvent);
    };
  }, []);

  const room = rooms.find(({ id }) => id === user.id);

  const handleSendAnswer = (answer) => {
    postData("/answer", { answer }).then((data) => {
      console.log(data);
    });
  };

  return (
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <div>Start at 21:00</div>
      <Countdown date={new Date().setHours(21, 0, 0, 0)} />

      {user ? (
        <Space>
          {get(user, "participate") ? (
            <>
              <div>
                <Space>
                  {user.login} {user.answer}
                </Space>
                <Space>
                  {get(room, "oponent.name")} {get(room, "oponent.answer")}
                </Space>
              </div>
              <Space.Compact block>
                <Button onClick={() => handleSendAnswer(0)}>0</Button>
                <Button onClick={() => handleSendAnswer(1)}>1</Button>
              </Space.Compact>
            </>
          ) : (
            <Button
              onClick={() => {
                postData("/participate", user).then((data) => {
                  console.log(data);

                  setUser({ ...user, participate: true });
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
