# BOOM TEN (붐텐) - 숫자 폭탄 퍼즐 게임

> 숫자를 드래그해 합이 10이 되면 BOOM! 폭발하는 물리 기반 하이퍼 캐주얼 퍼즐 게임

## 게임 방법

1. 화면에 떨어지는 숫자 공들 위를 **드래그**
2. 선택된 숫자들의 합이 **정확히 10**이 되면 자석 효과와 함께 폭발
3. 빠르게 연속 제거하면 **콤보 배율** 상승
4. 공이 상단 위험선에 3초 이상 닿으면 **GAME OVER**

## 기술 스택

- **Vanilla JS** (ES6+) - 빌드 도구 없이 순수 구현
- **Matter.js** v0.19.0 - 2D 물리 엔진 (CDN)
- **Tailwind CSS** Play CDN - 유틸리티 스타일링
- **Lucide Icons** - UI 아이콘
- **PWA** - Service Worker 오프라인 지원, manifest.json

## 프로젝트 구조

```
WebGame/
├── index.html            # 메인 엔트리 (SPA)
├── manifest.json         # PWA 매니페스트
├── service-worker.js     # 오프라인 캐시
├── js/
│   ├── game.js           # Matter.js 물리 엔진 코어
│   ├── drag.js           # 드래그 감지 & Sum-10 매칭
│   ├── effects.js        # 파티클/폭발 이펙트
│   ├── ui.js             # UI 화면 전환 & HUD
│   └── index.js          # 앱 부트스트랩
├── css/                  # (인라인 스타일 사용)
├── assets/
│   └── icons/            # PWA 아이콘
└── README.md
```

## 핵심 게임 로직

### 물리 엔진 설정
- 중력: `{ x: 0, y: 1.5 }` (느린 낙하감)
- 공 반발력: 0.3, 마찰: 0.1, 공기저항: 0.01
- 최대 동시 공 개수: 60개

### Match-10 알고리즘
1. 터치/마우스 드래그 궤적 내 반경 35px 이내 Ball 감지
2. Set 기반 중복 방지, 합이 10 이하일 때만 선택 추가
3. 합 === 10: 중심점 계산 → gravityScale 0 → 중심점 방향 velocity 부여 (자석 효과)
4. 300ms 후 파티클 폭발 + 점수 부여 + Body 제거
5. 400ms 후 대체 공 생성

### 콤보 시스템
- 제거 후 1.5초 이내 추가 제거 시 콤보 배율 상승
- 점수: `(10 × 선택수) × (1 + combo × 0.5)`

### Edge Case 처리
1. 동시 멀티터치 → 첫 번째 터치만 인식
2. 같은 공 중복 선택 → Set으로 구조적 방지
3. 합 초과 (>10) → 해당 공 스킵, 드래그 유지
4. 애니메이션 중 입력 → isAnimating 플래그로 차단
5. 화면 밖 드래그 / 탭 전환 → visibilitychange로 강제 종료

## 수익화 레이아웃

- **하단 배너**: 320×50 광고 플레이스홀더
- **좌우 사이드바**: 160×600 (데스크톱 1024px+ 전용)
- **게임 오버**: 보상형 광고 이어하기 버튼

## 로컬 실행

빌드 도구 불필요. 정적 파일 서버로 실행:

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code Live Server 확장 사용
```

## 배포

GitHub Pages에 직접 배포 가능 (정적 파일 구조):

1. GitHub 저장소에 Push
2. Settings > Pages > Source: main branch, / (root)
3. 배포 URL: `https://<username>.github.io/<repo>/`

## 라이선스

MIT License

---

**BOOM TEN** - Made with Matter.js
