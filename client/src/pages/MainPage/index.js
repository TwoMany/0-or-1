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
import { AnswerModal } from "./AnswerModal";
import { VideoPlayer } from "./VideoPlayer";

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
  const [anserModalOpen, setAnserModalOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();
  const [hideCount, setHideCount] = useState(false);
  const [gameStarted, setGameStarted] = useState(0);
  const [videoId, setVideoId] = useState();

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
      console.log("onPlayersChange")
      if (!isEqual(players, value)) {
        const playerIndex = (value || []).findIndex(({ userId }) => get(user, "_id") === userId);
        setPlayers(value);
        console.log(playerIndex);
        if (dayjs(countdown).diff(dayjs()) <= 0 && playerIndex >= 0) setGameStarted(1);
      }
    }
    socket.on("players", onPlayersChange);
    return () => {
      socket.off("players", onPlayersChange);
    };
  }, [players, countdown, user]);

  useEffect(() => {
    function onGameFinish(value) {
      setWinner(value.winner);
      setVideoId(undefined);
      setPlayers([]);
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
      } else {
        if(gameStarted !== 1) {
          setGameStarted(1);
        }
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

  const playerStyles = {
    border: "1px solid lightgray",
    padding: 48,
  };

  const isMobile = window.innerWidth < 868;

  const playerIndex = (players || []).findIndex(({ userId }) => get(user, "_id") === userId);
  const player = get(players, playerIndex);

  if (player && !gameStarted && dayjs(countdown).diff(dayjs()) <= 0) {
    setGameStarted(2);
  }

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  const answer1 = playerIndex % 2 === 0 ? get(player, "answer") : get(oponent, "answer");

  const answer2 = playerIndex % 2 !== 0 ? get(player, "answer") : get(oponent, "answer");

  const diff = countdown && roundInterval ? Math.floor(dayjs().diff(dayjs(countdown)) / roundInterval) : 0;

  const newVideoId = get(
    videos,
    `[${
      videos.length && diff % videos.length >= 0 && diff % videos.length < videos.length ? diff % videos.length : 0
    }].link`
  );

  if (newVideoId != videoId) {
    setVideoId(newVideoId);
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
                  Игра начнётся в {formatTime(hours)}:{formatTime(minutes)}
                </div>
                {countdown && !hideCount && (!gameStarted || gameStarted === 2) && (
                  <>
                    осталось{" "}
                    <Countdown
                      // overtime={Boolean(get(players, "length")) && dayjs(countdown).diff(dayjs()) <= 0}
                      overtime
                      // date={dayjs(countdown).diff(dayjs()) <= 0 && get(players, "length") ? timer : countdown}
                      date={countdown}
                      onComplete={() => {
                        // if (players.length >= 2) setAnserModalOpen(true);
                        !dayjs(countdown).diff(dayjs()) && window.location.reload();
                        if (get(players, "length")) {
                          if (!gameStarted) setGameStarted(1);
                          // setHideCount(true);
                          // setTimeout(() => {
                          //   setHideCount(false);
                          // }, 0);
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
                            {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
                          </span>
                        );
                      }}
                    />
                  </>
                )}
              </div>
            )}

            {player && !winner ? (
              <VideoPlayer
                videoId={videoId}
                players={players}
                user={user}
                setGameStarted={setGameStarted}
                gameStarted={gameStarted}
                propsTimer={timer}
                setPropsTimer={setTimer}
                roundInterval={roundInterval}
              />
            ) : (
              <div></div>
            )}

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

            {user ? (
              <Space direction="vertical" align="center">
                <div>
                  {user.login} | {get(players, "length")} участников
                </div>
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
          </Space>
        )}
        {anserModalOpen && (
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
        )}
      </Content>
    </Layout>
  );
};
