// background.js (현재 영상의 분류 결과도 함께 관리)

const GEMINI_API_KEY = "AIzaSyBIXdr1IqXGAlxdsmubap2Jkv1umnkDHV0";
const GEMINI_MODEL = "gemini-1.5-flash-latest";

let viewingHistory = [];
let latestBiasAnalysis = { /* ... 초기값 ... */ };
let currentVideoData = null;
let lastAnalyzedSentiment = null; // 👇 [추가] 마지막으로 분석된 sentiment를 저장할 변수

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "YOUTUBE_VIDEO_DATA":
      currentVideoData = request.data;
      lastAnalyzedSentiment = null; // 👇 새 영상이 들어오면 이전 sentiment는 초기화
      analyzeAndStore(request.data);
      break;
    
    case "GET_POPUP_DATA":
      sendResponse({
        biasData: latestBiasAnalysis,
        currentVideo: currentVideoData,
        currentSentiment: lastAnalyzedSentiment // 👇 팝업에 sentiment 정보 추가
      });
      break;
  }
  return true;
});

async function analyzeAndStore(videoData) {
  const prompt = `
    다음 유튜브 영상의 제목과 설명을 분석하여, 주제와 정치적/이념적 성향을 분류해줘.
    성향은 '중립', '진보', '보수', '극좌', '극우', '공산주의 옹호', '자본주의 비판', '음모론적', '과학적' 등 구체적인 분류로 답변해야 해.
    결과는 반드시 아래와 같은 JSON 형식으로만 응답해야 해:
    {"topic": "...", "sentiment": "..."}
    ---
    [분석할 콘텐츠]
    제목: ${videoData.title}
    설명: ${videoData.description}
    ---
  `;
  
  const analysis = await callGeminiAPI(prompt);
  
  if (analysis && analysis.sentiment) {
    console.log("🤖 AI 분석 결과:", analysis);
    lastAnalyzedSentiment = analysis.sentiment; // 👇 분석 결과를 변수에 저장
    viewingHistory.push(analysis);
    if (viewingHistory.length > 20) viewingHistory.shift();
    updateBiasSummary();
  } else {
    console.error("AI 분석 실패 또는 유효하지 않은 결과:", analysis);
    lastAnalyzedSentiment = "분석 실패"; // 👇 실패한 경우도 저장
  }
}

// callGeminiAPI 함수와 updateBiasSummary 함수는 이전과 동일하게 유지...
// (이전 답변에 있는 코드를 그대로 사용하시면 됩니다)
async function callGeminiAPI(prompt) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "contents": [{ "parts": [{ "text": prompt }] }],
        "generationConfig": { "responseMimeType": "application/json" }
      })
    });
    if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
    
    const result = await response.json();
    return JSON.parse(result.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Gemini API 호출 중 오류:", error);
    return null;
  }
}

// background.js 파일에서 이 함수를 찾아 아래 내용으로 교체하세요.

/**
 * 편향성 요약 업데이트 함수 (로직 수정 버전)
 */
function updateBiasSummary() {
  const total = viewingHistory.length;
  // 👇 함수가 시작될 때마다 변수를 초기화합니다.
  let summaryText = `현재까지 총 ${total}개의 영상을 분석했습니다.`;
  let biasScore = 0;
  let recommendations = ["다양한 주제를 탐색해보세요!"]; // 기본 추천 주제를 항상 보장
  
  // 👇 여기서 숫자를 2로 바꾸면, 3개째 영상부터 분석을 시작합니다.
  if (total > 2) { 
      const sentimentCounts = viewingHistory.reduce((acc, item) => {
          acc[item.sentiment] = (acc[item.sentiment] || 0) + 1;
          return acc;
      }, {});

      let dominantTendency = "균형 잡힘";
      let maxCount = 0;
      for (const sentiment in sentimentCounts) {
          if (sentimentCounts[sentiment] > maxCount) {
              maxCount = sentimentCounts[sentiment];
              dominantTendency = sentiment;
          }
      }
      
      if (dominantTendency !== "중립" && dominantTendency !== "균형 잡힘") {
          const percentage = Math.round((maxCount / total) * 100);
          if (percentage > 40) {
              biasScore = percentage;
              summaryText = `최근 시청 영상의 ${biasScore}%가 '${dominantTendency}' 성향에 편중되었습니다.`;
              // 편향이 감지될 때만 추천 주제를 새로운 것으로 교체
              recommendations = [`'${dominantTendency}'에 대한 반대 시각 영상 보기`, "관련 주제에 대한 역사적 배경 학습", "주요 언론사의 교차보도 확인"];
          }
      }
  }

  // 👇 어떤 경우든 항상 recommendations 배열을 포함한 객체를 생성
  latestBiasAnalysis = {
    score: biasScore,
    summary: summaryText,
    videoCount: total,
    recommendations: recommendations
  };

  console.log("📊 편향성 분석 결과 업데이트:", latestBiasAnalysis);
}