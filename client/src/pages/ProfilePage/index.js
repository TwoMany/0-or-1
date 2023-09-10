import { Button, Space, Input, Form, Layout, InputNumber, notification, Tabs, Table } from "antd";
import { postData, putData } from "../../tools";
import { Content, Header } from "antd/es/layout/layout";
import { LogoutOutlined, HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  if (!user) {
    navigate("/");
  }
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  const profile = (
    <Space align="center">
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
  );

  const partners = (
    <Table dataSource={[]} columns={[
      {
        title: '№',
        dataIndex: 'number',
        key: 'number',
      },
      {
        title: 'Партнер',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'Деятельность',
        dataIndex: 'activity',
        key: 'activity',
      },
      {
        title: 'Ролик',
        dataIndex: 'link',
        key: 'link',
      },
      {
        title: 'Веб-сайт',
        dataIndex: 'site',
        key: 'site',
      },
      {
        title: 'Промокод',
        dataIndex: 'code',
        key: 'code',
      },
    ]}/>
  )

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
      <Header style={{ display: "flex", alignItems: "center", justifyContent: 'flex-end' }}>
        <Space>
          <Button
            onClick={() => {
              navigate("/");
            }}
            icon={<HomeOutlined style={{fontSize: 16}} />}
            >Вернутся в игру</Button>
          <Button
            disabled={!localStorage.getItem("user")}
            onClick={() => {
              localStorage.removeItem("user");
              window.location.reload();
            }}
            icon={<LogoutOutlined style={{fontSize: 16}} />}
          >Выйти</Button>
        </Space>
      </Header>
      <Content style={{ padding: "12px 24px", minHeight: 280 }}>
        <Tabs items={tabs}/>
      </Content>
    </Layout>
  );
};
