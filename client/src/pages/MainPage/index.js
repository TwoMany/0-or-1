import { Button, Space } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";
import { postData } from "../../tools";
import { useEffect, useState } from "react";
import { get } from "lodash";

export const MainPage = () => {
  const [user, setUser] = useState();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {}, [rooms]);

  const room = rooms.find(({ id }) => id === user.id);

  const handleSendAnswer = (answer) => {
    postData("/answer", { answer }).then((data) => {
      console.log(data); // JSON data parsed by `response.json()` call
    });
  };

  return (
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <div>Start at 21:00</div>
      <Countdown date={new Date().setHours(21, 0, 0, 0)} />

      {user ? (
        <Space>
          {room ? (
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
                  console.log(data); // JSON data parsed by `response.json()` call
                });
              }}
            >
              Register
            </Button>
          )}
        </Space>
      ) : (
        <LoginForm />
      )}
    </Space>
  );
};
