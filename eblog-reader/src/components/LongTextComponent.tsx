import React, { useState, useEffect, useRef } from "react";

const LongTextComponent: React.FC = () => {
  const [fontSize, setFontSize] = useState(16);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [content, setContent] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomBarHeight = 52;

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch("/sample.txt");
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error("텍스트 파일 로드 에러:", error);
      }
    };
    loadContent();
  }, []);

  const calculatePages = (
    text: string,
    containerHeight: number,
    currentFontSize: number
  ) => {
    if (!text || containerHeight === 0) return [];

    const virtualElement = document.createElement("div");
    virtualElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: calc(100% - 24px);
      font-size: ${currentFontSize}px;
      line-height: 1.5;
      word-break: break-word;
      white-space: pre-wrap;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    document.body.appendChild(virtualElement);

    const maxHeight = containerHeight;
    const calculatedPages: string[] = [];
    let remainingText = text;

    while (remainingText.length > 0) {
      let start = 0;
      let end = remainingText.length;
      let mid: number;

      // 이진 검색으로 페이지에 들어갈 수 있는 텍스트 양 찾기
      while (start < end) {
        mid = Math.floor((start + end) / 2);
        const testText = remainingText.substring(0, mid);
        virtualElement.textContent = testText;

        if (virtualElement.offsetHeight <= maxHeight) {
          start = mid + 1;
        } else {
          end = mid;
        }
      }

      let splitPosition = start - 1;

      // 개선된 문장 경계 찾기 로직
      if (splitPosition > 0) {
        // 현재 위치부터 뒤로 검색하면서 적절한 분할 지점 찾기
        let searchEnd = Math.max(0, splitPosition - 100); // 너무 멀리 가지 않도록 제한
        let foundBreakPoint = false;

        for (let i = splitPosition; i > searchEnd && !foundBreakPoint; i--) {
          // 문장 끝 패턴 확인 (.?!)
          if (/[.!?]/.test(remainingText[i])) {
            // 다음 문자가 있고 공백이나 줄바꿈이면 여기서 자르기
            if (
              i < remainingText.length - 1 &&
              /[\s\n]/.test(remainingText[i + 1])
            ) {
              splitPosition = i + 1;
              foundBreakPoint = true;
            }
            // 마지막 문자이면 여기서 자르기
            else if (i === remainingText.length - 1) {
              splitPosition = i + 1;
              foundBreakPoint = true;
            }
          }
          // 줄바꿈 문자를 만나면 여기서 자르기
          else if (remainingText[i] === "\n") {
            splitPosition = i + 1;
            foundBreakPoint = true;
          }
        }
      }

      // 페이지 콘텐츠 추가
      const pageContent = remainingText.substring(0, splitPosition).trim();
      if (pageContent) {
        calculatedPages.push(pageContent);
      }

      // 남은 텍스트 업데이트
      remainingText = remainingText.substring(splitPosition).trim();

      // 안전장치: 더 이상 진행이 없는 경우
      if (splitPosition === 0 && remainingText.length > 0) {
        // 최소한 현재 줄의 끝까지는 포함
        let lineEnd = remainingText.indexOf("\n");
        if (lineEnd === -1) lineEnd = Math.min(remainingText.length, 50);
        calculatedPages.push(remainingText.substring(0, lineEnd));
        remainingText = remainingText.substring(lineEnd).trim();
      }
    }

    document.body.removeChild(virtualElement);
    return calculatedPages;
  };

  useEffect(() => {
    const calculateAvailableHeight = () => {
      const windowHeight = window.innerHeight;
      return windowHeight - bottomBarHeight;
    };

    if (!content) return;

    const availableHeight = calculateAvailableHeight();
    const newPages = calculatePages(content, availableHeight, fontSize);
    setPages(newPages);

    if (page >= newPages.length) {
      setPage(Math.max(0, newPages.length - 1));
    }
  }, [content, fontSize, window.innerHeight]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0 && page < pages.length - 1) {
        setPage((p) => p + 1);
      } else if (diff < 0 && page > 0) {
        setPage((p) => p - 1);
      }
    }
  };

  const touchStartX = useRef<number>(0);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && page < pages.length - 1) {
        setPage((p) => p + 1);
      } else if (e.key === "ArrowLeft" && page > 0) {
        setPage((p) => p - 1);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [page, pages.length]);

  return (
    <>
      <div
        ref={contentRef}
        style={{
          height: `calc(100vh - ${bottomBarHeight}px)`,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            padding: "12px",
            fontSize: `${fontSize}px`,
            lineHeight: "1.5",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            WebkitTextSizeAdjust: "100%",
            transition: "font-size 0.2s ease",
          }}
        >
          {pages[page]}
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${bottomBarHeight}px`,
          padding: "8px 12px",
          borderTop: "1px solid #eee",
          background: "#f8f9fa",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setFontSize((prev) => Math.max(12, prev - 2))}
            style={{
              padding: "4px 6px",
              background: "#007aff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            A-
          </button>
          <span style={{ fontSize: "12px" }}>{fontSize}px</span>
          <button
            onClick={() => setFontSize((prev) => Math.min(24, prev + 2))}
            style={{
              padding: "4px 6px",
              background: "#007aff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            A+
          </button>
        </div>
        <div style={{ fontSize: "12px" }}>
          {page + 1} / {pages.length}
        </div>
      </div>
    </>
  );
};

export default LongTextComponent;
