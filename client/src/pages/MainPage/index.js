import { Button, Space } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";
import { postData } from "../../tools";
import { useState } from "react";

export const MainPage = () => {
  const [user, setUser] = useState();
  return (
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <div>Start at 21:00</div>
      <Countdown date={new Date().setHours(21, 0, 0, 0)} />

      {user ? (
        <>
          <Button
            onClick={() => {
              postData("/participate", user).then((data) => {
                console.log(data); // JSON data parsed by `response.json()` call
              });
            }}
          >
            Register
          </Button>
        </>
      ) : (
        <LoginForm />
      )}
    </Space>
  );
};
