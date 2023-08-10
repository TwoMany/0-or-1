import { Input, Form, Space, Button } from "antd";
import { useState } from "react";
import { postData } from "../../../tools";

export const LoginForm = () => {
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
      style={{
        maxWidth: 600,
      }}
      onFinish={(values) => {
        if (isLogin) {
          postData("/signin", values).then((data) => {
            console.log(data); // JSON data parsed by `response.json()` call
          });
        } else {
          postData("/signup", values).then((data) => {
            console.log(data); // JSON data parsed by `response.json()` call
          });
        }
      }}
    >
      {!isLogin && (
        <Form.Item
          label="Login"
          name="login"
          rules={[
            {
              required: true,
              message: "Please input your login!",
            },
          ]}
        >
          <Input />
        </Form.Item>
      )}
      <Form.Item
        label="Phone"
        name="phone"
        rules={[
          {
            required: true,
            message: "Please input your phone!",
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[
          {
            required: true,
            message: "Please input your password!",
          },
        ]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        wrapperCol={{
          offset: 8,
          span: 16,
        }}
      >
        <Space>
          {isLogin ? (
            <Button onClick={() => setIsLogin(false)}>Sign Up</Button>
          ) : (
            <Button onClick={() => setIsLogin(true)}>Sign In</Button>
          )}
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};
