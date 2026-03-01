# BOOM TEN (붐텐) - 2048 + 수박게임 하이브리드

> 같은 숫자를 합쳐 2048을 만들어라! 물리 기반 합체 퍼즐 게임

**[플레이하기](https://jay-lim97.github.io/boom-ten/)**

## 게임 방법

1. 화면을 **터치/클릭**하여 공을 떨어뜨릴 X 위치를 선택
2. 같은 숫자의 공이 **물리적으로 충돌**하면 자동으로 합체
3. **1+1→2, 2+2→4, 4+4→8, ... 1024+1024→2048!**
4. 점수 = 현재 보유한 **가장 높은 숫자**의 공
5. 공이 상단 위험선에 3초 이상 닿으면 **GAME OVER**

## 스폰 확률

| 숫자 | 확률 | 색상 |
|------|------|------|
| 1 | 40% | 빨강 |
| 2 | 30% | 주황 |
| 4 | 20% | 노랑 |
| 8 | 10% | 초록 |

9 이상의 숫자(16, 32, 64, ...)는 합체로만 생성됩니다.

## 기술 스택

- **Vanilla JS** (ES6+) - 빌드 도구 없이 순수 구현
- **Matter.js** v0.19.0 - 2D 물리 엔진 (CDN)
- **Tailwind CSS** Play CDN - 유틸리티 스타일링
- **Lucide Icons** - UI 아이콘
- **PWA** - Service Worker 오프라인 지원

## 프로젝트 구조

```
WebGame/
├── index.html            # 메인 엔트리 (SPA)
├── manifest.json         # PWA 매니페스트
├── service-worker.js     # 오프라인 캐시 (network-first)
├── dev-server.py         # 개발용 no-cache 서버
├── js/
│   ├── game.js           # Matter.js 물리 엔진 + 충돌 합체 로직
│   ├── drop.js           # 터치/클릭 드랍 컨트롤 + 고스트 프리뷰
│   ├── effects.js        # 파티클/폭발 이펙트
│   ├── ui.js             # UI 화면 전환 & HUD
│   └── index.js          # 앱 부트스트랩
└── assets/
    └── icons/            # PWA 아이콘
```

## 핵심 게임 로직

### 합체(Merge) 알고리즘
1. `Matter.Events.on(engine, 'collisionStart')` 로 충돌 감지
2. 같은 숫자의 공 쌍 발견 시 `merging` Set으로 이중 처리 방지
3. 두 공 제거 → 중간점에 2배 숫자의 새 공 생성
4. 새 공이 즉시 같은 숫자와 충돌하면 **연쇄 합체** 발생

### 물리 엔진 설정
- 중력: `{ x: 0, y: 1.5 }`
- 공 크기: `radius = 16 + log2(number) × 4 + 2` (큰 숫자 = 큰 공)
- 최대 동시 공: 80개
- 드랍 쿨다운: 500ms

### 수익화 레이아웃
- 하단 배너: 320×50 광고 플레이스홀더
- 좌우 사이드바: 160×600 (데스크톱 전용)
- 게임 오버: 보상형 광고 이어하기 버튼

## 로컬 실행

```bash
# 개발 서버 (no-cache 헤더 포함)
python dev-server.py

# 또는 기본 정적 서버
python -m http.server 8080
```

## 배포

GitHub Pages 정적 배포:
1. `git push origin main`
2. Settings > Pages > Source: main branch
3. https://jay-lim97.github.io/boom-ten/

## 라이선스

MIT License

---

**BOOM TEN** - 2048 × Suika Game | Made with Matter.js
