import { Button, Layout } from "antd";
import { MainPage } from "./pages/MainPage";
import { Content, Header } from "antd/es/layout/layout";

function App() {
  return (
    <div className="App">
      <Layout style={{ padding: "24px 0" }}>
        <Header style={{ display: "flex", alignItems: "center" }}>
          <Button
            disabled={!localStorage.getItem("user")}
            onClick={() => {
              localStorage.removeItem("user");
              window.location.reload();
            }}
          />
        </Header>
        <Content style={{ padding: "12px 24px", minHeight: 280 }}>
          <MainPage />
        </Content>
      </Layout>
    </div>
  );
}

export default App;
