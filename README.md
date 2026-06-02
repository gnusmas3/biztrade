# BizTrade

> 검증된 소규모 기업과 매장을 찾고, 분석하고, 인수하세요.

BizTrade는 소규모 기업 M&A(인수·합병)를 위한 마켓플레이스 플랫폼입니다.
매물 등록부터 기업가치 평가, 실사, 문의까지 인수 과정 전반을 지원합니다.

## 주요 기능

- **검증된 매물** — 등록된 모든 매물은 관리자 검토(`pending → approved`) 후 게시됩니다.
- **간편 가치평가** — 업종별 배수와 재무 데이터를 기반으로 기업가치를 자동 계산합니다.
- **실사 체크리스트** — 인수 전 확인해야 할 핵심 실사 항목을 안내합니다.
- **인수 후 운영 지원** — 인수 이후 운영을 위한 가이드를 제공합니다.
- **매물 문의** — 관심 매물에 대해 문의를 남기고 관리자가 응대합니다.
- **관리자 대시보드** — 매물·회원·문의를 관리하는 어드민 영역을 제공합니다.

## 기술 스택

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS
- **Backend / DB**: [Supabase](https://supabase.com/) (PostgreSQL + RLS)

## 프로젝트 구조

```
app/
├── (main)/            # 공개 영역 레이아웃
├── page.tsx           # 홈
├── deals/             # 매물 목록 및 상세 (/deals, /deals/[id])
├── sell/              # 매물 등록
├── valuation/         # 기업가치 평가
└── admin/             # 관리자 (로그인, 매물, 회원, 문의)
components/            # Navbar, Footer, DealCard, InquiryModal 등 공용 컴포넌트
lib/supabase.ts        # Supabase 클라이언트
types/                 # 도메인 타입 (Deal, Inquiry, admin)
supabase_setup.sql     # DB 스키마 및 RLS 정책
```

## 데이터 모델

- **deals** — 매물 정보 (업종, 지역, 재무 데이터, 희망가, 상태 등)
- **inquiries** — 매물 문의
- **profiles** — 사용자 프로필

자세한 테이블 정의와 Row Level Security 정책은 `supabase_setup.sql`을 참고하세요.

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 Supabase 정보를 입력합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. 데이터베이스 설정

Supabase 프로젝트의 SQL Editor에서 `supabase_setup.sql`을 실행해 테이블과 정책을 생성합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속합니다.

## 사용 가능한 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
