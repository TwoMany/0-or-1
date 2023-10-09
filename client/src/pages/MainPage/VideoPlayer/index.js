import { get } from "lodash";
import YouTube from "react-youtube";
import "./index.css";
import { useCallback, useEffect, useState } from "react";
import { postData } from "../../../tools";
import { Button, Space } from "antd";
import { UserOutlined } from "@ant-design/icons";
import video from "./qq.mp4";
import dayjs from "dayjs";

export const VideoPlayer = ({
  players,
  user,
  videoId,
  gameStarted,
  propsTimer,
  setGameStarted,
  setPropsTimer,
  roundInterval,
}) => {
  const [youtubePlayer, setYoutubePlayer] = useState();
  const [videLayer, setVideoLayer] = useState(true);
  const [countdown, setCountdown] = useState();

  useEffect(() => {
    if (gameStarted === 1 && !countdown) {
      setCountdown(10);
    }
  }, [gameStarted]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((a) => (a - 1 <= 0 ? 0 : a - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const playerIndex = (players || []).findIndex(({ userId }) => get(user, "_id") === userId);
  const player = get(players, playerIndex);

  const oponentIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  const oponent = get(players, oponentIndex);

  const answer1 = playerIndex % 2 === 0 ? get(player, "answer") : get(oponent, "answer");

  const answer2 = playerIndex % 2 !== 0 ? get(player, "answer") : get(oponent, "answer");

  const onReady = (event) => {
    // access to player in all event handlers via event.target
    // event.target.pauseVideo();
    setYoutubePlayer(event.target);
  };

  const handleSendAnswer = useCallback(
    (answer) => {
      // youtubePlayer.setVolume(100);
      // if (youtubePlayer) youtubePlayer.playVideo();
      postData("/answer", { answer, userId: get(user, "_id") }).then((data) => {
        setCountdown(0);
        if (videLayer) setVideoLayer(false);
        if (youtubePlayer) youtubePlayer.playVideo();
      });
    },
    [user, videLayer, youtubePlayer]
  );
  if (countdown <= 0) {
    if (videLayer && !get(player, 'answer')) {
      setVideoLayer(false);
      setGameStarted(2)
      if (youtubePlayer) youtubePlayer.playVideo();
    }
    // setGameStarted(false);
    // setPropsTimer(dayjs().startOf("minute").valueOf() + Number(roundInterval));
  }

  return (
    <div style={{ position: "relative", height: !gameStarted ? 0 : 'auto', overflow: 'auto'}}>
      <div className="auto-resizable-iframe" style={{ pointerEvents: "none", width: "100%" }}>
        <YouTube
          videoId={videoId}
          opts={{
            // height: "390",
            // width: "640",
            playerVars: {
              controls: 0,
              // https://developers.google.com/youtube/player_parameters
              // autoplay: 1,
              // loop: 1,
            },
          }}
          onReady={onReady}
          // onStateChange={(event) => {
          //   setYoutubePlayer(event.target);
          // }}
          onStateChange={(state) => {
            console.log(state)
            if (state.data === 0) {
              setVideoLayer(true);
            }
          }}
          onError={(e) => {
            console.log(e);
          }}
        />
        {videLayer && <video loop autoPlay src={video} muted id="emptyVideo" />}
      </div>

      {Boolean(countdown) && <div className="counter">{countdown}</div>}
      <Space direction="vertical" className="actions" align="center">
        {player && !player.answer && (
          <>{playerIndex % 2 === 0 ? <Button shape="circle">?</Button> : <Button shape="circle">!</Button>}</>
        )}
        <Button shape="circle" icon={<UserOutlined />} />
        <Button
          shape="circle"
          type="primary"
          disabled={!player || player.answer || !countdown}
          onClick={() => handleSendAnswer(1)}
        >
          1
        </Button>
        <Button
          shape="circle"
          type="primary"
          disabled={!player || player.answer || !countdown}
          onClick={() => handleSendAnswer(0)}
        >
          0
        </Button>
        <Button shape="circle" icon={<UserOutlined />} />
        {player && !player.answer && (
          <>{playerIndex % 2 === 0 ? <Button shape="circle">!</Button> : <Button shape="circle">?</Button>}</>
        )}
      </Space>
    </div>
  );
};
