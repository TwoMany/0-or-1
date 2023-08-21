import { Input, Form, Space, Button, notification } from "antd";
import { useState } from "react";
import { postData } from "../../../tools";

export const LoginForm = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Form
      name="login"
      labelCol={{
        span: 8,
      }}
      wrapperCol={{
        span: 16,
      }}
      style={
        {
          // width: 800,
        }
      }
      onFinish={(values) => {
        if (isLogin) {
          postData("/signin", values).then((data) => {
            console.log(data);
            setUser(data.response);
            window.location.reload();
          });
        } else {
          postData("/signup", values).then((data) => {
            notification.success({ message: "Successfully" });
            // setIsLogin(true)
            setUser(data.response);
            window.location.reload();
          });
        }
      }}
    >
      {!isLogin && (
        <Form.Item
          label="Логін"
          name="login"
          rules={[
            {
              required: true,
              message: "Введіть логін!",
            },
          ]}
        >
          <Input />
        </Form.Item>
      )}
      <Form.Item
        label="Телефон"
        name="phone"
        rules={[
          {
            required: true,
            message: "Введіть телефон!",
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Пароль"
        name="password"
        rules={[
          {
            required: true,
            message: "Введіть пароль!",
          },
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        wrapperCol={{
          offset: 4,
          span: 20,
        }}
      >
        <Space>
          {isLogin ? (
            <Button onClick={() => setIsLogin(false)}>Реєстрація</Button>
          ) : (
            <Button onClick={() => setIsLogin(true)}>Вхід</Button>
          )}
          <Button type="primary" htmlType="submit">
            Гаразд
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};
