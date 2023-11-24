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
import "./index.css";
import { AnswerModal } from "./AnswerModal";
import { VideoPlayer } from "./VideoPlayer";

export const MainPage = () => {
  const [user, setUser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : undefined);
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState();
  const [winner, setWinner] = useState();
  const [hours, setHours] = useState(22);
  const [minutes, setMinutes] = useState(0);
  const [offset, setOffset] = useState(0);
  const [roundInterval, setRoundInterval] = useState(60000);
  const [countdown, setCountdown] = useState();
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  // const [anserModalOpen, setAnserModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();
  // const [hideCount, setHideCount] = useState(false);
  // const [gameStarted, setGameStarted] = useState(0);
  const [videoId, setVideoId] = useState();

  const fetchPlayers = useCallback(async () => {
    if (loadingPlayers) return;

    // setLoadingPlayers(true);
    const response = await fetch(
      process.env.REACT_APP_ENVIRONMENT === "production"
        ? "https://server.illusion-game.com/players"
        : "http://localhost:9000/players",
      {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: process.env.REACT_APP_ENVIRONMENT === "production" ? "cors" : undefined, // no-cors, *cors, same-origin
      }
    );
    const data = await response.json();
    setPlayers(data.response.players);
    setPhase(data.response.phase);
    setLoadingPlayers(false);
  }, []);

  const fetchVideos = useCallback(async () => {
    const response = await fetch(
      process.env.REACT_APP_ENVIRONMENT === "production"
        ? "https://server.illusion-game.com/videos"
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
        ? "https://server.illusion-game.com/time"
        : "http://localhost:9000/time",
      {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: process.env.REACT_APP_ENVIRONMENT === "production" ? "cors" : undefined, // no-cors, *cors, same-origin
      }
    );
    const time = await response.json();
    const offset = Number(Math.floor(new Date().getTimezoneOffset() / 60) * -1);
    const hours = Number(time.gameStartHour) + offset;
    const gameStartHour = hours >= 24 ? hours - 24 : hours;
    console.log(offset, gameStartHour);
    const cnt = new Date().setHours(gameStartHour, time.gameStartMinutes, 0, 0);
    setHours(time.gameStartHour);
    setMinutes(time.gameStartMinutes);
    setRoundInterval(time.roundInterval);
    // setTimer(dayjs(cnt).startOf("minute").valueOf() + Number(time.roundInterval));
    setCountdown(cnt);
    setOffset(offset);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    fetchData();
    fetchPlayers();
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
      if (phase) return;
      console.log("onPlayersChange", value);
      if (!isEqual(players, value)) {
        setPlayers(value);
      }
    }
    socket.on("players", onPlayersChange);
    return () => {
      socket.off("players", onPlayersChange);
    };
  }, [players, user, phase]);

  useEffect(() => {
    function onPhaseChange(value) {
      console.log("GAME_SOCKET", value);
      const playerIndex = players.findIndex(({ userId }) => get(user, "_id") === userId);
      const currIndex = (value.players || []).findIndex(({ userId }) => get(user, "_id") === userId);
      if (playerIndex === -1) return;
      if (currIndex === -1) {
        notification.error({ message: "Проиграл" });
        setPhase(null);
        setPlayers(value.players);
        return;
      }

      if (phase === "IDLE") notification.success({ message: "Победа" });
      setPhase(value.phase);
      setPlayers(value.players);
    }
    socket.on("GAME_SOCKET", onPhaseChange);
    return () => {
      socket.off("GAME_SOCKET", onPhaseChange);
    };
  }, [phase, players, user]);

  useEffect(() => {
    function onGameFinish(value) {
      setWinner(value.winner);
      setVideoId(undefined);
      setPlayers([]);
      setPhase(null);
    }
    socket.on("game_finished", onGameFinish);
    return () => {
      socket.off("game_finished", onGameFinish);
    };
  }, [winner]);

  // useEffect(() => {
  //   function onLose(value = []) {
  //     console.log(value, user);

  //     if (value.includes(user._id)) {
  //       notification.error({ message: "Проиграл" });
  //       setPhase(null);
  //     }
  //   }
  //   socket.on("losers", onLose);
  //   return () => {
  //     socket.off("losers", onLose);
  //   };
  // }, [user]);

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

  const playerIndex = (players || []).findIndex(({ userId }) => get(user, "_id") === userId);
  const player = get(players, playerIndex);

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  const diff = countdown && roundInterval ? Math.floor(dayjs().diff(dayjs(countdown)) / roundInterval) : 0;

  if (phase === "START") {
    const newVideoId = get(
      videos,
      `[${
        videos.length && diff % videos.length >= 0 && diff % videos.length < videos.length ? diff % videos.length : 0
      }].link`
    );

    if (newVideoId != videoId) {
      setVideoId(newVideoId);
    }
  }

  const formatTime = (digit) => (digit < 10 ? `0${digit}` : digit);

  // console.log(diff, videoId, dayjs(countdown).diff(dayjs()));

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
                  Игра начнётся в {formatTime(Number(hours) + offset)}:{formatTime(minutes)}
                </div>
                {countdown && !phase && (
                  <>
                    осталось{" "}
                    <Countdown
                      // overtime={Boolean(get(players, "length")) && dayjs(countdown).diff(dayjs()) <= 0}
                      overtime
                      // date={dayjs(countdown).diff(dayjs()) <= 0 && get(players, "length") ? timer : countdown}
                      date={countdown}
                      // onComplete={() => {
                      //   // if (players.length >= 2) setAnserModalOpen(true);
                      //   !dayjs(countdown).diff(dayjs()) && window.location.reload();
                      //   if (get(players, "length")) {
                      //     if (!gameStarted) setGameStarted(1);
                      //     // setHideCount(true);
                      //     // setTimeout(() => {
                      //     //   setHideCount(false);
                      //     // }, 0);
                      //   }
                      // }}
                      onStop={() => {
                        console.log("stop");
                      }}
                      renderer={({ hours, minutes, seconds, completed }) => {
                        // render completed
                        if (completed) return <span>00:00:00</span>;
                        // render current countdown time
                        return (
                          <span>
                            {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
                          </span>
                        );
                      }}
                    />
                  </>
                )}
              </div>
            )}

            {user ? (
              <Space direction="vertical" align="center">
                <div>
                  {user.login} | {get(players, "length")} участников
                </div>
                {oponent && phase && <div>опонент {oponent.name}</div>}
                {dayjs(countdown).diff(dayjs()) <= 0 && player && oponent ? (
                  <></>
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

            {/* {player && !winner ? ( */}
            <VideoPlayer videoId={videoId} players={players} user={user} phase={phase} setPhase={setPhase} />
            {/* ) : (
              <div></div>
            )} */}

            {/* {videoId && Boolean(get(players, "length")) && player && !hideCount ? (
              <div className="auto-resizable-iframe" style={{ pointerEvents: "none", width: "100%" }}>
                <YouTube
                  videoId={videoId}
                  opts={opts}
                  onReady={onReady}
                  // onStateChange={(event) => {
                  //   setYoutubePlayer(event.target);
                  // }}
                  onError={(e) => {
                    console.log(e);
                  }}
                />
              </div>
            ) : (
              <div></div>
            )} */}

            {winner && (
              <h2>
                Победитель {winner.name} {winner.bot ? "(BOT)" : ""}
              </h2>
            )}
          </Space>
        )}
        {/* {anserModalOpen && (
          <AnswerModal
            open={false && anserModalOpen}
            onCancel={() => {
              setAnserModalOpen(false);
              // if (youtubePlayer && player) {
              //   // youtubePlayer.setVolume(100);
              //   youtubePlayer.playVideo();
              // }
            }}
            onAnswer={(ans) => {
              // handleSendAnswer(ans);
              setAnserModalOpen(false);
              // if (youtubePlayer && player) {
              //   // youtubePlayer.setVolume(100);
              //   youtubePlayer.playVideo();
              // }
            }}
          />
        )} */}
      </Content>
    </Layout>
  );
};
