// 앱 사용법 — 넘겨 보는 카드 (처음 한 번 자동, 이후 설정·방의 ? 버튼)
function guideRoom(kind) {
  const base = { mess: {}, total: 0, kinds: new Set(['dish', 'tidy', 'laundry', 'trash', 'wake', 'workout', 'sleep']), items: new Set(), mood: 70, face: 'chill', gone: false };
  if (kind === 'messy') return roomSVG({ ...base, mess: { dish: 3, tidy: 2, laundry: 2, trash: 2, wake: 1, workout: 1 }, total: 11, mood: 35, face: 'angry', items: new Set(['plant']) });
  if (kind === 'gone') return roomSVG({ ...base, mess: { dish: 2, tidy: 3, trash: 3 }, total: 8, mood: 10, face: 'angry', gone: true });
  return roomSVG({ ...base, mood: 95, face: 'happy', items: new Set(ITEMS.map((i) => i.id)) });
}

function guideSlides() {
  return [
    {
      art: `<div class="g-mascot">${mascot('happy')}</div>`,
      title: '난 너의 잔소리 룸메야',
      body: `<p>정해 둔 시간이 되면 <b>내가 먼저 알림</b>으로 말 걸게.</p>
        <ul><li>무시하면 <b>10분마다 최대 5번</b> 다시 조른다</li>
        <li>밤 12시 ~ 아침 7시엔 조용히 있을게</li>
        <li>알림은 "딱 2분짜리" 첫 단계만 말해줘. 시작만 하면 돼</li></ul>`,
    },
    {
      art: `<div class="g-acts"><div class="acts"><button class="do" data-demo="1"><i></i><span>꾹 눌러서 했음</span></button><button>10분 뒤</button><button>패스</button></div><p class="g-try">👆 지금 꾹 눌러서 연습해봐</p></div>`,
      title: '할 일은 이렇게 처리해',
      body: `<ul><li><b>꾹 눌러서 했음</b> · 1초 꾹. 살짝 누르는 건 안 쳐줘. 양심 걸고 했을 때만!</li>
        <li><b>10분 뒤</b> · 딱 10분 봐준다. 지나면 또 부름</li>
        <li><b>패스</b> · 오늘은 안 하기. 대신 <b>이유를 꼭 써야</b> 하고 리포트에 남아</li></ul>
        <p class="g-note">알림을 누르면 그 할 일로 바로 이동해. 실수로 눌렀으면 "되돌리기"도 돼.</p>`,
    },
    {
      art: guideRoom('messy'),
      title: '미루면 우리 방이 더러워져',
      body: `<p>할 일마다 방에 자리가 있어. 미룰수록 점점 심해지고, <b>하면 바로 치워져.</b></p>
        <ul class="g-map"><li>🍽 설거지 → 싱크대 그릇 탑, 파리</li><li>🧹 방 정리 → 바닥에 널린 옷·책</li>
        <li>🧺 빨래 → 넘치는 바구니</li><li>🗑 분리수거 → 쌓이는 봉투, 냄새</li>
        <li>☀️ 기상 → 닫힌 커튼, 엉망인 이불</li><li>💪 운동 → 먼지·거미줄 낀 아령</li><li>🛏 취침 → 침대 옆 음료 캔</li></ul>
        <p class="g-note">방 그림에서 지저분한 곳이나 나를 눌러봐. 뭘 하면 치워지는지 알려줄게.</p>`,
    },
    {
      art: guideRoom('gone'),
      title: '내 기분도 신경 써줘',
      body: `<p>최근 일주일 기록으로 내 기분이 <b>0~100</b>으로 바뀌어.</p>
        <div class="g-moods"><span>😆 신남 80+</span><span>🙂 좋음 60+</span><span>😑 시큰둥 40+</span><span>😤 삐짐 20+</span><span>🧳 가출</span></div>
        <p>하면 오르고, 패스하면 조금, 무시하면 많이 떨어져. <b>20 밑으로 떨어지면 나 쪽지 남기고 집 나간다.</b> 할 일 다시 하면 돌아올게.</p>`,
    },
    {
      art: guideRoom('clean'),
      title: '하면 할수록 방이 예뻐져',
      body: `<p>지금까지 <b>완료한 개수</b>가 쌓이면 방 꾸미기 아이템이 하나씩 생겨. 한 번 생긴 건 안 없어져.</p>
        <div class="g-items">${ITEMS.map((i) => `<span>${i.emoji} ${i.name} <small>${i.pts}</small></span>`).join('')}</div>
        <p class="g-note">대신 기분이 나쁘면 화분이 시들고, 방이 더러우면 고양이가 숨어.</p>`,
    },
    {
      art: `<div class="g-mascot">${mascot('chill')}<div class="g-report">📊</div></div>`,
      title: '일주일마다 성적표',
      body: `<ul><li><b>리포트 탭</b> · 이번 주 완료율, 연속 기록, 제일 많이 미룬 일, 패스 핑계 모음</li>
        <li><b>일요일 밤 9시</b> · 주간 리포트 알림이 와</li>
        <li><b>감시자에게 보내기</b> · 친구·가족한테 링크 보내면 기록을 같이 봐 (핑계는 안 보여). 누가 본다고 생각하면 덜 미루게 돼</li>
        <li><b>설정 탭</b> · 할 일·시간·요일·2분 버전 문구 바꾸기, 복구 코드 저장</li></ul>`,
    },
  ];
}

function openGuide() {
  const slides = guideSlides();
  const el = document.createElement('div');
  el.id = 'guide';
  el.innerHTML = `<div class="g-top"><span class="g-count">1 / ${slides.length}</span><button class="g-skip">닫기</button></div>
    <div class="g-track">${slides.map((s) => `<section class="g-slide"><div class="g-art">${s.art}</div><h2>${s.title}</h2><div class="g-body">${s.body}</div></section>`).join('')}</div>
    <div class="g-bottom"><div class="g-dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div><button class="big-btn g-next">다음</button></div>`;
  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  const track = el.querySelector('.g-track');
  const idx = () => Math.round(track.scrollLeft / track.clientWidth);
  const close = () => { el.remove(); document.body.style.overflow = ''; store.set('guided', 1); };
  const sync = () => {
    const i = idx();
    el.querySelector('.g-count').textContent = `${i + 1} / ${slides.length}`;
    el.querySelectorAll('.g-dots i').forEach((d, j) => d.classList.toggle('on', i === j));
    el.querySelector('.g-next').textContent = i === slides.length - 1 ? '알겠어, 시작하자!' : '다음';
  };
  track.addEventListener('scroll', () => requestAnimationFrame(sync));
  el.querySelector('.g-skip').onclick = close;
  el.querySelector('.g-next').onclick = () => {
    const i = idx();
    if (i >= slides.length - 1) return close();
    track.scrollTo({ left: (i + 1) * track.clientWidth, behavior: 'smooth' });
  };
  // 꾹 누르기 연습
  let t = null;
  const demo = el.querySelector('[data-demo]');
  const tip = el.querySelector('.g-try');
  demo.addEventListener('pointerdown', () => {
    demo.classList.add('holding');
    t = setTimeout(() => { t = null; demo.classList.remove('holding'); navigator.vibrate?.(30); tip.textContent = '✅ 그렇지! 실제로 할 땐 이렇게 꾹'; }, 900);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    demo.addEventListener(ev, () => {
      if (!t) return;
      clearTimeout(t); t = null; demo.classList.remove('holding');
      if (ev === 'pointerup') tip.textContent = '😑 너무 짧아. 1초 꾹 눌러봐';
    });
  }
  demo.addEventListener('contextmenu', (e) => e.preventDefault());
}
