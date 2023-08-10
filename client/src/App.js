import { Layout } from "antd";
import { MainPage } from "./pages/MainPage";
import { Content } from "antd/es/layout/layout";

function App() {
  return (
    <div className="App">
      <Layout>
        <Content>
          <MainPage />
        </Content>
      </Layout>
    </div>
  );
}

export default App;
