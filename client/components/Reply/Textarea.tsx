import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import icon from "@/types/icon";

interface ReplyInputProps {
  onClose?: () => void;
  onSubmit?: (text: string, isReveal: boolean) => void | Promise<void>;
}

const MAX_COMMENT = 1000;

const ReplyInput: React.FC<ReplyInputProps> = ({ onClose, onSubmit }) => {
  const [text, setText] = useState("");
  const [isReveal, setIsReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSend = async () => {
    if (submitting || !text.trim() || text.length > MAX_COMMENT) return;

    if (onSubmit) {
      setSubmitting(true);
      try {
        await onSubmit(text, isReveal);
      } catch {
        return;
      } finally {
        setSubmitting(false);
      }
    }

    setText("");
    onClose?.();
  };

  return (
    <div className="relative mt-3 animate-fade-in-down">
      <div className="px-3 py-3 rounded-xl bg-[#ffffff10] border border-[#ffffff05]">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className={`border-transparent border p-2 pr-12 rounded-lg bg-[rgba(var(--bg-body))] w-full outline-none resize-none overflow-hidden text-white text-sm transition-all duration-200 focus:border-[#ffffff20] ${
              text.length > MAX_COMMENT ? "border-red-500 focus:border-red-500" : ""
            }`}
            rows={3}
            maxLength={MAX_COMMENT + 100}
            placeholder="Viết bình luận..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div
            className={`absolute bottom-2 right-2 rounded-lg px-1 py-1 text-[10px] ${
              text.length > MAX_COMMENT ? "text-red-400" : "text-gray-500"
            }`}
          >
            {text.length}/{MAX_COMMENT}
          </div>
        </div>

        {text.length > MAX_COMMENT && (
          <p className="text-xs text-red-400 mt-1 ml-1">
            Bạn đã vượt quá giới hạn ký tự!
          </p>
        )}

        <div className="mt-2 flex justify-between items-center">
          <button
            onClick={() => setIsReveal((prev) => !prev)}
            className="flex items-center space-x-2 cursor-pointer"
            type="button"
          >
            <div
              className={clsx(
                "relative flex-shrink-0 rounded-2xl w-[30px] border h-[18px] transition-colors duration-300",
                isReveal ? "bg-primary/10 border-primary" : " border-gray-600"
              )}
            >
              <span
                className={clsx(
                  "absolute h-[8px] w-[8px] rounded-[20px] transition-all duration-300 ease-in-out",
                  "top-[4px]",
                  isReveal ? "bg-primary left-[18px]" : "bg-gray-600 left-[4px]"
                )}
              ></span>
            </div>
            <span className="text-white text-[13px]">Tiết lộ?</span>
          </button>

          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs bg-gray-400/10 px-3 py-2 rounded-md text-gray-400 hover:text-white font-medium"
                type="button"
              >
                Hủy
              </button>
            )}
            <button
              className="flex items-center space-x-2 text-primary bg-primary/10 rounded-md px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSend}
              disabled={submitting || !text.trim() || text.length > MAX_COMMENT}
              type="button"
            >
              <span className="font-medium text-xs">{submitting ? "Đang gửi" : "Gửi"}</span>
              <icon.Send width={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplyInput;
