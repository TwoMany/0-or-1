import { Button, Layout } from "antd";
import { MainPage } from "./pages/MainPage";
import { Content, Header } from "antd/es/layout/layout";
import { LogoutOutlined } from "@ant-design/icons";

function App() {
  return (
    <div className="App">
      <Layout>
        <Header style={{ display: "flex", alignItems: "center" }}>
          {localStorage.getItem("user") && (
            <Button
              disabled={!localStorage.getItem("user")}
              onClick={() => {
                localStorage.removeItem("user");
                window.location.reload();
              }}
              icon={<LogoutOutlined />}
            />
          )}
        </Header>
        <Content style={{ padding: "12px 24px", minHeight: 280 }}>
          <MainPage />
        </Content>
      </Layout>
    </div>
  );
}

export default App;
