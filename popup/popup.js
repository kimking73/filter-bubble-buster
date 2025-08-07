// popup.js (데이터를 안전하게 확인하는 버전)

document.addEventListener('DOMContentLoaded', () => {
  const scoreEl = document.getElementById('bias-score');
  const summaryEl = document.getElementById('summary');
  const videoCountEl = document.getElementById('video-count');
  const recommendationsList = document.getElementById('recommendations');

  const currentTitleEl = document.getElementById('current-video-title');
  const currentDescEl = document.getElementById('current-video-description');
  const currentSentimentEl = document.getElementById('current-video-sentiment');

  chrome.runtime.sendMessage({ type: "GET_POPUP_DATA" }, (response) => {
    if (!response) {
      summaryEl.textContent = "데이터를 불러오는 데 실패했습니다.";
      return;
    }

    const biasData = response.biasData;
    if (biasData) {
      scoreEl.textContent = `${biasData.score}%`;
      summaryEl.textContent = biasData.summary;
      videoCountEl.textContent = `(총 ${biasData.videoCount}개 영상 기반)`;
      summaryEl.classList.remove('status');

      recommendationsList.innerHTML = ''; // 목록 초기화
      
      // 👇 [핵심 수정] recommendations가 실제로 배열일 때만 forEach를 실행하도록 변경
      if (biasData.recommendations && Array.isArray(biasData.recommendations)) {
        biasData.recommendations.forEach(rec => {
          const li = document.createElement('li');
          li.textContent = rec;
          recommendationsList.appendChild(li);
        });
      }
    }

    const currentVideo = response.currentVideo;
    if (currentVideo) {
      currentTitleEl.textContent = currentVideo.title;
      currentDescEl.textContent = currentVideo.description.substring(0, 300) + (currentVideo.description.length > 300 ? '...' : '');
      currentTitleEl.classList.remove('status');
      currentDescEl.classList.remove('status');

      const currentSentiment = response.currentSentiment;
      if (currentSentiment) {
        currentSentimentEl.textContent = `[ AI 분류: ${currentSentiment} ]`;
        currentSentimentEl.classList.remove('status');
      } else {
        currentSentimentEl.textContent = "[ AI 분석 중... ]";
      }
    } else {
      currentTitleEl.textContent = "현재 보고 있는 영상 정보가 없습니다.";
      currentSentimentEl.textContent = "";
    }
  });
});