import { Button, Space, Input, Form, Layout, InputNumber, notification, Tabs, Table } from "antd";
import { postData, putData } from "../../tools";
import { Content, Header } from "antd/es/layout/layout";
import { LogoutOutlined, HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const [hours, setHours] = useState();
  const [minutes, setMinutes] = useState();
  const [roundInterval, setRoundInterval] = useState();
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  if (!user) {
    navigate("/");
  }

  const fetchData = useCallback(async () => {
    const response = await fetch(
      process.env.REACT_APP_ENVIRONMENT === "production"
        ? "https://server.illusion-game.com/time"
        : "http://localhost:9000/time",
      {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: process.env.REACT_APP_ENVIRONMENT === "production" ? "cors" : undefined, // no-cors, *cors, same-origin
      }
    );
    const time = await response.json();
    setHours(time.gameStartHour);
    setMinutes(time.gameStartMinutes);
    setRoundInterval(time.roundInterval);
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    fetchData();
  }, []);

  const offset = Math.floor(new Date().getTimezoneOffset() / 60) * -1;

  const profile = (
    <Space>
      <Form
        name="profile"
        layout="vertical"
        style={{
          maxWidth: 800,
        }}
        onFinish={(values) => {
          putData("/user", { ...values, _id: user._id }).then((data) => {
            setUser(data.response);
            // window.location.reload();
          });
        }}
      >
        <Form.Item label="Номер банковской карты" name="card">
          <Input />
        </Form.Item>
        <Form.Item label="Криптокошелек USDT (TRC-20)" name="crypto">
          <Input />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Сохранить
          </Button>
        </Form.Item>
      </Form>

      {user && user.isAdmin && roundInterval && (
        <Form
          name="time"
          layout="vertical"
          style={{
            maxWidth: 800,
          }}
          initialValues={{
            gameStartHour: Number(hours) + Number(offset),
            gameStartMinutes: minutes,
            roundInterval,
          }}
          onFinish={(values) => {
            const gameStartHour = values.gameStartHour - offset;
            postData("/time", {
              ...values,
              gameStartHour: gameStartHour < 0 ? 24 - gameStartHour : gameStartHour,
            }).then((data) => {
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
          <Form.Item label="Интервал (мс)" name="roundInterval">
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
  );

  const partners = (
    <Table
      dataSource={[]}
      columns={[
        {
          title: "№",
          dataIndex: "number",
          key: "number",
        },
        {
          title: "Партнер",
          dataIndex: "name",
          key: "name",
        },
        {
          title: "Деятельность",
          dataIndex: "activity",
          key: "activity",
        },
        {
          title: "Ролик",
          dataIndex: "link",
          key: "link",
        },
        {
          title: "Веб-сайт",
          dataIndex: "site",
          key: "site",
        },
        {
          title: "Промокод",
          dataIndex: "code",
          key: "code",
        },
      ]}
    />
  );

  const tabs = [
    {
      key: "1",
      label: "Профиль",
      children: profile,
    },
    {
      key: "2",
      label: "Партнеры",
      children: partners,
    },
  ];

  return (
    <Layout>
      <Header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <Space>
          <Button
            onClick={() => {
              navigate("/");
            }}
            icon={<HomeOutlined style={{ fontSize: 16 }} />}
          >
            Вернутся в игру
          </Button>
          <Button
            disabled={!localStorage.getItem("user")}
            onClick={() => {
              localStorage.removeItem("user");
              navigate("/");
              window.location.reload();
            }}
            icon={<LogoutOutlined style={{ fontSize: 16 }} />}
          >
            Выйти
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: "12px 24px", minHeight: 280 }}>
        <Tabs items={tabs} />
      </Content>
    </Layout>
  );
};
