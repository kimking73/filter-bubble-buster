// content_script.js (영상 변경을 감지하는 최종 버전)

let lastVideoId = null; // 마지막으로 처리한 영상의 ID를 저장할 변수

/**
 * 현재 페이지의 제목과 설명을 추출하여 백그라운드로 보내는 함수
 */
function extractAndSendData() {
  // 제목과 설명을 다시 찾음
  const videoTitle = document.querySelector('h1.style-scope.ytd-watch-metadata')?.innerText || '제목을 찾지 못함';
  const videoDescription = document.querySelector('#description-inline-expander .yt-core-attributed-string')?.innerText || '설명을 찾지 못함';

  // 제목을 성공적으로 찾았을 경우에만 데이터 전송
  if (videoTitle !== '제목을 찾지 못함') {
    const videoData = {
      title: videoTitle,
      description: videoDescription,
    };
    console.log("✅ 새로운 영상 데이터 전송:", videoData);
    chrome.runtime.sendMessage({ type: "YOUTUBE_VIDEO_DATA", data: videoData });
  }
}

/**
 * 현재 URL에서 영상 ID가 변경되었는지 확인하는 함수
 */
function checkForVideoChange() {
  // 현재 URL에서 'v=' 파라미터(영상 ID)를 가져옴
  const urlParams = new URLSearchParams(window.location.search);
  const currentVideoId = urlParams.get('v');

  // 현재 영상 ID가 존재하고, 이전에 처리한 ID와 다르다면
  if (currentVideoId && currentVideoId !== lastVideoId) {
    console.log(`🎥 영상이 변경되었습니다: (이전: ${lastVideoId} -> 현재: ${currentVideoId})`);
    
    // 현재 ID를 마지막으로 처리한 ID로 업데이트
    lastVideoId = currentVideoId;
    
    // URL이 바뀐 후, 유튜브가 페이지 내용을 업데이트할 시간을 주기 위해 잠시 기다림 (매우 중요!)
    // 2초 후에 데이터 추출 함수를 실행
    setTimeout(extractAndSendData, 2000);
  }
}

// 1초마다 주기적으로 영상이 변경되었는지 확인
setInterval(checkForVideoChange, 1000);

console.log("🚀 필터 버블 버스터: 영상 변경 감시 시작.");