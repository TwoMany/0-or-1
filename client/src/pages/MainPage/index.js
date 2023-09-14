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
import "./index.css";

export const MainPage = () => {
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  const [players, setPlayers] = useState([]);
  const [winner, setWinner] = useState();
  const [timer, setTimer] = useState();
  const [hours, setHours] = useState(22);
  const [minutes, setMinutes] = useState(0);
  const [roundInterval, setRoundInterval] = useState(60000);
  const [countdown, setCountdown] = useState();
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState();
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();
  const [hideCount, setHideCount] = useState(false);

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
  }, []);

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
    const cnt = new Date().setHours(time.gameStartHour, time.gameStartMinutes, 0, 0);
    setHours(time.gameStartHour);
    setMinutes(time.gameStartMinutes);
    setRoundInterval(time.roundInterval);
    setTimer(dayjs(cnt).startOf("minute").valueOf() + Number(time.roundInterval));
    setCountdown(cnt);
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
      setWinner(value.winner);
    }
    socket.on("game_finished", onGameFinish);
    return () => {
      socket.off("game_finished", onGameFinish);
    };
  }, [winner]);

  useEffect(() => {
    function onLose(value = []) {
      console.log(value, user);

      if (value.includes(user._id)) {
        notification.error({ message: "Проиграл" });
      }
    }
    socket.on("losers", onLose);
    return () => {
      socket.off("losers", onLose);
    };
  }, [user]);

  useEffect(() => {
    function onKick(value = []) {
      if (value.includes(user._id)) {
        notification.error({ message: "Пара не найдена!" });
      }
    }
    socket.on("kicked", onKick);
    return () => {
      socket.off("kicked", onKick);
    };
  }, [user]);

  const handleSendAnswer = useCallback(
    (answer) => {
      youtubePlayer.setVolume(100);
      youtubePlayer.playVideo();
      postData("/answer", { answer, userId: get(user, "_id") }).then((data) => {
        console.log(data);
      });
    },
    [user, youtubePlayer]
  );

  const playerIndex = (players || []).findIndex(({ userId }) => get(user, "_id") === userId);
  const player = get(players, playerIndex);

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  const opts = {
    // height: "390",
    // width: "640",
    playerVars: {
      controls: 0,
      // https://developers.google.com/youtube/player_parameters
      autoplay: 1,
      loop: 1,
    },
  };

  const playerStyles = {
    border: "1px solid lightgray",
    padding: 48,
  };

  const onReady = (event) => {
    // access to player in all event handlers via event.target
    event.target.pauseVideo();
    setYoutubePlayer(event.target);
  };

  const isMobile = window.innerWidth < 868;

  const answer1 = playerIndex % 2 === 0 ? get(player, "answer") : get(oponent, "answer");

  const answer2 = playerIndex % 2 !== 0 ? get(player, "answer") : get(oponent, "answer");

  const diff = countdown && roundInterval ? Math.floor(dayjs().diff(dayjs(countdown)) / roundInterval) : 0;

  const videoId = get(
    videos,
    `[${
      videos.length && diff % videos.length >= 0 && diff % videos.length < videos.length ? diff % videos.length : 0
    }].link`
  );

  console.log(timer, videoId, diff);

  return (
    <Layout>
      <Header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {localStorage.getItem("user") && (
          <Space align="end">
            <Button
              onClick={() => {
                navigate("/profile");
              }}
              icon={<UserOutlined style={{ fontSize: 16 }} />}
            >
              Личный кабинет
            </Button>
            <Button
              disabled={!localStorage.getItem("user")}
              onClick={() => {
                localStorage.removeItem("user");
                window.location.reload();
              }}
              icon={<LogoutOutlined style={{ fontSize: 16 }} />}
            >
              Выйти
            </Button>
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
          <Space className="mainSpace" direction="vertical" align="center" style={{ width: "100%", fontSize: 18 }}>
            {user && (
              <div style={{ fontSize: 24, textAlign: "center" }}>
                <div style={{ fontSize: 28 }}>
                  Игра начнётся в {hours}:{minutes}
                </div>
                осталось{" "}
                {countdown && !hideCount && (
                  <Countdown
                    // overtime={Boolean(get(players, "length")) && dayjs(countdown).diff(dayjs()) <= 0}
                    overtime
                    date={dayjs(countdown).diff(dayjs()) <= 0 && get(players, "length") ? timer : countdown}
                    onComplete={() => {
                      if (dayjs(countdown).diff(dayjs()) <= 0 && get(players, "length")) {
                        setTimer(dayjs().startOf("minute").valueOf() + Number(roundInterval));
                        fetchPlayers();

                        if (youtubePlayer && player) {
                          youtubePlayer.setVolume(100);
                          youtubePlayer.playVideo();
                        }
                      } else if (get(players, "length")) {
                        setHideCount(true);
                        setTimeout(() => {
                          setHideCount(false);
                        }, 0);
                      }
                    }}
                    onStop={() => {
                      console.log("stop");
                    }}
                    renderer={({ hours, minutes, seconds, completed }) => {
                      // render completed
                      if (completed) return <span>00:00:00</span>;
                      // render current countdown time
                      return (
                        <span>
                          {hours}:{minutes}:{seconds}
                        </span>
                      );
                    }}
                  />
                )}
              </div>
            )}

            {videoId && Boolean(get(players, "length")) && player ? (
              <div className="auto-resizable-iframe" style={{ pointerEvents: "none", width: "100%" }}>
                <YouTube
                  videoId={videoId}
                  opts={opts}
                  onReady={onReady}
                  onStateChange={(event) => {
                    console.log(event);
                    setYoutubePlayer(event.target);
                  }}
                />
              </div>
            ) : (
              <div></div>
            )}

            {winner && (
              <h2>
                Победитель {winner.name} {winner.bot ? "(BOT)" : ""}
              </h2>
            )}

            {user ? (
              <Space direction="vertical" align="center">
                <div>
                  {user.login} | {get(players, "length")} участников
                </div>
                {dayjs(countdown).diff(dayjs()) <= 0 && player && oponent ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        minWidth: 280,
                        gap: isMobile ? 24 : 96,
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      <Space direction="vertical" align="center" style={playerStyles}>
                        <UserOutlined style={{ fontSize: 48 }} />
                        <div style={{ fontWeight: 700 }}>{player.name}</div>
                        {playerIndex % 2 === 0 ? "загадывает" : "разгадывает"}
                        {!get(players, `[${playerIndex}].answer`) && (
                          <Space direction="vertical" align="center" style={{ marginBottom: -14 }}>
                            <div style={{ marginTop: 14 }}>Сделайте выбор</div>
                            <Space.Compact block>
                              <Button size="large" onClick={() => handleSendAnswer(0)}>
                                0
                              </Button>
                              <Button size="large" onClick={() => handleSendAnswer(1)}>
                                1
                              </Button>
                            </Space.Compact>
                          </Space>
                        )}
                      </Space>

                      <Space direction="vertical" align="center">
                        Загадал
                        <div
                          style={{
                            padding: 18,
                            border: "1px solid lightgray",
                            width: 128,
                            textAlign: "center",
                            background:
                              player.answer === null || oponent.answer === null || playerIndex % 2 !== 0
                                ? "none"
                                : answer1 === answer2
                                ? "#f39292"
                                : "#74e978",
                          }}
                        >
                          {player.answer === null || oponent.answer === null ? "-" : answer1}
                        </div>
                        <div style={{ fontWeight: 700 }}>VS</div>
                        Отгадал
                        <div
                          style={{
                            padding: 18,
                            border: "1px solid lightgray",
                            width: 128,
                            textAlign: "center",
                            background:
                              player.answer === null || oponent.answer === null || playerIndex % 2 === 0
                                ? "none"
                                : answer1 !== answer2
                                ? "#f39292"
                                : "#74e978",
                          }}
                        >
                          {player.answer === null || oponent.answer === null ? "-" : answer2}
                        </div>
                      </Space>
                      <Space direction="vertical" align="center" style={playerStyles}>
                        <UserOutlined style={{ fontSize: 48 }} />
                        <div style={{ fontWeight: 700 }}>
                          {oponent.name} {oponent.bot ? "(BOT)" : ""}{" "}
                        </div>
                        {oponentIndex % 2 === 0 ? "загадывает" : "разгадывает"}
                      </Space>
                    </div>
                  </>
                ) : (
                  <>
                    {dayjs(countdown).diff(dayjs(), "minute", true) <= 5 &&
                      dayjs(countdown).diff(dayjs(), "minute", true) >= 0 && (
                        <Button
                          disabled={player}
                          onClick={() => {
                            // youtubePlayer.setVolume(100);
                            //   youtubePlayer.playVideo();
                            postData("/participate", user).then((data) => {
                              notification.success({ message: "Вы в игре!" });
                            });
                          }}
                          size="large"
                          type="primary"
                        >
                          Принять участие
                        </Button>
                      )}
                  </>
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
