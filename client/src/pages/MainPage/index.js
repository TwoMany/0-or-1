import { Button, Space, Spin, Layout, notification } from "antd";
import Countdown from "react-countdown";
import { LoginForm } from "./LoginForm";
import { postData } from "../../tools";
import { useCallback, useEffect, useState } from "react";
import { socket } from "../../socket";
import * as dayjs from "dayjs";
import { get, isEqual } from "lodash";
import { Content, Header } from "antd/es/layout/layout";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import YouTube from "react-youtube";

export const MainPage = () => {
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  const [players, setPlayers] = useState([]);
  const [winner, setWinner] = useState();
  const [hours, setHours] = useState(22);
  const [minutes, setMinutes] = useState(0);
  const [countdown, setCountdown] = useState();
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  const fetchPlayers = useCallback(async () => {
    if (loadingPlayers) return;
    
    // setLoadingPlayers(true);
    const response = await fetch(
      process.env.REACT_APP_ENVIRONMENT === "production"
        ? "https://server.illusiumgame.com/players"
        : "http://localhost:9000/players",
      {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: process.env.REACT_APP_ENVIRONMENT === "production" ? "cors" : undefined, // no-cors, *cors, same-origin
      }
    );
    const players = await response.json();
    setPlayers(players.response);
    setLoadingPlayers(false);
  }, [loadingPlayers]);

  const fetchVideos = useCallback(async () => {
    const response = await fetch(
      process.env.REACT_APP_ENVIRONMENT === "production"
        ? "https://server.illusiumgame.com/videos"
        : "http://localhost:9000/videos",
      {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: process.env.REACT_APP_ENVIRONMENT === "production" ? "cors" : undefined, // no-cors, *cors, same-origin
      }
    );
    const videos = await response.json();
    setVideos(videos.response);
  }, []);

  const fetchData = useCallback(async () => {
    if (loadingData) return;
    setLoadingData(true);
    const response = await fetch(
      process.env.REACT_APP_ENVIRONMENT === "production"
        ? "https://server.illusiumgame.com/time"
        : "http://localhost:9000/time",
      {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: process.env.REACT_APP_ENVIRONMENT === "production" ? "cors" : undefined, // no-cors, *cors, same-origin
      }
    );
    const time = await response.json();
    setHours(time.gameStartHour);
    setMinutes(time.gameStartMinutes);
    setCountdown(new Date().setHours(time.gameStartHour, time.gameStartMinutes, 0, 0));
    setLoadingData(false);
  }, []);

  useEffect(() => {
    fetchPlayers();
    fetchData();
    fetchVideos();
  }, []);

  useEffect(() => {
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    function onPlayersChange(value) {
      if (!isEqual(players, value)) setPlayers(value);
    }
    socket.on("players", onPlayersChange);
    return () => {
      socket.off("players", onPlayersChange);
    };
  }, [players]);

  useEffect(() => {
    function onGameFinish(value) {
      setWinner(value);
    }
    socket.on("game_finished", onGameFinish);
    return () => {
      socket.off("game_finished", onGameFinish);
    };
  }, [winner]);

  useEffect(() => {
    function onLose(value = []) {
      if (value.includes(user._id)) {
        notification.error({ message: "Проиграл" });
      }
    }
    socket.on("losers", onLose);
    return () => {
      socket.off("losers", onLose);
    };
  }, [user]);

  const handleSendAnswer = useCallback(
    (answer) => {
      postData("/answer", { answer, userId: get(user, "_id") }).then((data) => {
        console.log(data);
      });
    },
    [user]
  );

  const playerIndex = (players || []).findIndex(({ userId }) => get(user, "_id") === userId);
  const player = get(players, playerIndex);

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  const opts = {
    height: "390",
    width: "640",
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 1,
      loop: 1,
    },
  };

  const onReady = (event) => {
    // access to player in all event handlers via event.target
    event.target.mute();
  };

  const diff = countdown ? dayjs().diff(dayjs(countdown), 'minute') : 0;

  const videoId = get(videos, `[${ videos.length ? diff % videos.length : 0}].link`)

  console.log(videoId, diff % videos.length || 1)

  return (
    <Layout>
      <Header style={{ display: "flex", alignItems: "center" }}>
        {localStorage.getItem("user") && (
          <Space>
            <Button
              onClick={() => {
                navigate("/profile");
              }}
              icon={<UserOutlined />}
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
        )}
      </Header>
      <Content style={{ padding: "12px 24px", minHeight: 280 }}>
        {loadingPlayers || loadingData ? (
          <div
            style={{
              margin: "20px 0",
              marginBottom: 20,
              padding: "30px 50px",
              textAlign: "center",
            }}
          >
            <Spin />
          </div>
        ) : (
          <Space direction="vertical" align="center" style={{ width: "100%", fontSize: 18 }}>
            {user && (
              <div style={{ fontSize: 24, textAlign: "center" }}>
                <div style={{ fontSize: 28 }}>
                  Начало о {hours}:{minutes}
                </div>
                {countdown && (
                  <Countdown
                    overtime={Boolean(get(players, "length"))}
                    date={
                      dayjs(countdown).diff(dayjs()) <= 0 && get(players, "length")
                        ? dayjs().startOf("minute").valueOf() + 60000
                        : countdown
                    }
                    onComplete={() => {
                      fetchPlayers();
                    }}
                  />
                )}
              </div>
            )}

            {winner && <h2>Победитель {winner.login}</h2>}

            {videoId 
            && Boolean(get(players, "length")) && player 
            && (
              <YouTube
                videoId={videoId}
                opts={opts}
                onReady={onReady}
              />
            )}

            {user ? (
              <Space direction="vertical" align="center">
                <div>
                  {user.login} | {get(players, "length")} участников
                </div>
                {dayjs(countdown).diff(dayjs()) <= 0 && player && oponent ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", minWidth: 280, gap: 24 }}>
                      <div>
                        {player.name} ({oponent.answer !== null && player.answer !== null ? player.answer : "?"}){" "}
                        {playerIndex % 2 === 0 ? "загадывает" : "разгадывает"}
                      </div>
                      <div>
                        {oponent.name} {oponent.bot ? "(BOT)" : ""} (
                        {oponent.answer !== null && player.answer !== null ? oponent.answer : "?"}){" "}
                        {oponentIndex % 2 === 0 ? "загадывает" : "разгадывает"}
                      </div>
                    </div>
                    {!get(players, `[${playerIndex}].answer`) && (
                      <Space.Compact block>
                        <Button onClick={() => handleSendAnswer(0)}>0</Button>
                        <Button onClick={() => handleSendAnswer(1)}>1</Button>
                      </Space.Compact>
                    )}
                  </>
                ) : (
                  <Button
                    disabled={
                      player ||
                      dayjs(countdown).diff(dayjs(), "minute") > 5 ||
                      dayjs(countdown).diff(dayjs(), "minute") < 0
                    }
                    onClick={() => {
                      postData("/participate", user).then((data) => {});
                    }}
                    size="large"
                    type="primary"
                  >
                    Принять участие
                  </Button>
                )}
              </Space>
            ) : (
              <LoginForm setUser={setUser} />
            )}
          </Space>
        )}
      </Content>
    </Layout>
  );
};
