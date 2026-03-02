# Planet 2048 - 행성 합체 퍼즐

> 소행성에서 블랙홀까지! 같은 행성을 합쳐라! 물리 기반 행성 합체 퍼즐

**[플레이하기](https://jay-lim97.github.io/boom-ten/)**

## 게임 방법

1. 화면을 **터치/클릭**하여 행성을 떨어뜨릴 X 위치를 선택
2. 같은 행성이 **물리적으로 충돌**하면 자동으로 합체
3. **소행성+소행성→달, 달+달→화성, ... 중성자별+중성자별→블랙홀!**
4. 점수 = 현재 보유한 **가장 높은 등급**의 행성
5. 행성이 상단 위험선에 3초 이상 닿으면 **GAME OVER**

## 행성 진화 단계

| 숫자 | 천체 | 색상 |
|------|------|------|
| 1 | 소행성 | 갈색 |
| 2 | 달 | 은색 |
| 4 | 화성 | 붉은색 |
| 8 | 지구 | 파랑 |
| 16 | 해왕성 | 진한 파랑 |
| 32 | 토성 | 금색 (고리 포함) |
| 64 | 목성 | 오렌지 갈색 |
| 128 | 적색거성 | 빨강 (코로나 글로우) |
| 256 | 청색항성 | 파란 빛 |
| 512 | 초거성 | 금색 광채 |
| 1024 | 중성자별 | 백색 펄스 |
| 2048 | 블랙홀 | 강착원반 |

스폰 풀: 소행성(40%), 달(30%), 화성(20%), 지구(10%)
나머지는 합체로만 생성됩니다.

## 기술 스택

- **Vanilla JS** (ES6+) - 빌드 도구 없이 순수 구현
- **Matter.js** v0.19.0 - 2D 물리 엔진 (CDN)
- **Canvas 2D** - 프로시저럴 행성 렌더링 (이미지 없음)
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
│   ├── planets.js        # 프로시저럴 행성 Canvas 2D 렌더러 (12종)
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
2. 같은 숫자의 행성 쌍 발견 시 `merging` Set으로 이중 처리 방지
3. 두 행성 제거 → 중간점에 2배 숫자의 새 행성 생성
4. 새 행성이 즉시 같은 숫자와 충돌하면 **연쇄 합체** 발생

### 행성 렌더링 (planets.js)
- 12개 천체를 Canvas 2D로 프로시저럴 렌더링
- 소행성: 바위 텍스처, 달: 크레이터, 화성: 극관, 지구: 대륙+구름
- 토성: 고리 시스템, 목성: 수평 밴드+대적반
- 항성급(128+): shadowBlur 코로나 글로우 이펙트
- 블랙홀(2048): 강착원반 + 중력 렌즈 효과

### 물리 엔진 설정
- 중력: `{ x: 0, y: 1.5 }`
- 행성 크기: `radius = 16 + log2(number) × 4 + 2` (큰 숫자 = 큰 행성)
- 최대 동시 행성: 80개
- 드랍 쿨다운: 500ms

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

**Planet 2048** - 2048 × Suika Game | Made with Matter.js
