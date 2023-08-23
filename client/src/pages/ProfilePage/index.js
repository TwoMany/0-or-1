import { Button, Space, Input, Form, Layout, InputNumber, notification } from "antd";
import { postData, putData } from "../../tools";
import { Content, Header } from "antd/es/layout/layout";
import { LogoutOutlined, HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  if(!user) {
    navigate("/");
  }
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
  }, [user]);
  return (
    <Layout>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <Space>
          <Button
            onClick={() => {
              navigate("/");
            }}
            icon={<HomeOutlined />}
          />
          <Button
            disabled={!localStorage.getItem("user")}
            onClick={() => {
              localStorage.removeItem("user");
              window.location.reload();
            }}
            icon={<LogoutOutlined />}
          />
        </Space>
      </Header>
      <Content style={{ padding: "12px 24px", minHeight: 280 }}>
        <Space align="center">
          <Form
            name="profile"
            layout="vertical"
            style={{
              maxWidth: 800,
            }}
            onFinish={(values) => {
              putData("/user", { ...values, _id: user._id }).then((data) => {
                setUser(data.response)
                // window.location.reload();
              });
            }}
          >
            <Form.Item label="Карта" name="card">
              <Input />
            </Form.Item>
            <Form.Item label="Крипто" name="crypto">
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Сохранить
              </Button>
            </Form.Item>
          </Form>

          {user && user.isAdmin && (
            <Form
              name="time"
              layout="vertical"
              style={{
                maxWidth: 800,
              }}
              onFinish={(values) => {
                postData("/time", values).then((data) => {
                  notification.success({ message: "Сохранено" });
                });
              }}
            >
              <Form.Item label="Час" name="gameStartHour">
                <InputNumber />
              </Form.Item>
              <Form.Item label="Минута" name="gameStartMinutes">
                <InputNumber />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Сохранить
                </Button>
              </Form.Item>
            </Form>
          )}
        </Space>
      </Content>
    </Layout>
  );
};
