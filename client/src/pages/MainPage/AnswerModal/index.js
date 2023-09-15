import { Modal } from "antd";
import { useState } from "react";
import "./index.css";
import Countdown from "react-countdown";
import dayjs from "dayjs";

export const AnswerModal = ({ open, onCancel, onAnswer }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Modal open={open} footer={null} title={"Сделайте выбор"} destroyOnClose>
      <Countdown
        date={dayjs().startOf("m").valueOf() + 10000}
        onComplete={() => {
          onCancel();
        }}
      />
      <div className="wrap">
        <div className="ans" onClick={() => onAnswer(0)}>
          0
        </div>
        <div className="ans" onClick={() => onAnswer(1)}>
          1
        </div>
      </div>
    </Modal>
  );
};
