import { Button, Space } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";

export const MainPage = () => {
  return (
    <Space direction="vertical" align="center" style={{ width: "100%" }}>
      <div>Start at 21:00</div>
      <Countdown date={new Date().setHours(22, 0, 0, 0)} />
      <Button>Register</Button>

        <LoginForm/>
    </Space>
  );
};
