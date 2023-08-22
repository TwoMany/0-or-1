import { Input, Form, Space, Button, notification } from "antd";
import { useState } from "react";
import { postData } from "../../../tools";

export const LoginForm = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Form
      name="login"
      layout="vertical"
      style={
        {
          maxWidth: 800,
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
      {isLogin ? <h2>Логин</h2> : <h2>Регистрация</h2>}
      {!isLogin && (
        <Form.Item
          label="Логин"
          name="login"
          rules={[
            {
              required: true,
              message: "Введите логин!",
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
            message: "Введите телефон!",
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
            message: "Введите пароль!",
          },
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item>
        <Space>
          {isLogin ? (
            <Button type="text" onClick={() => setIsLogin(false)}>Регистрация</Button>
          ) : (
            <Button type="text" onClick={() => setIsLogin(true)}>Вход</Button>
          )}
          <Button type="primary" htmlType="submit">
            {isLogin ? "Войти" : "Зарегистрироваться"}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};
