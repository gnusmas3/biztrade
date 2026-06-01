import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 mt-24">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 12L5 5L8 9L10 6L12 12H2Z" fill="white" />
              </svg>
            </span>
            <span className="text-white font-semibold font-serif">BizTrade</span>
          </div>
          <p className="text-sm leading-relaxed">소규모 기업과 매장을 안전하게<br />사고파는 M&A 플랫폼</p>
        </div>
        <div>
          <p className="text-white text-sm font-medium mb-3">서비스</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/deals" className="hover:text-white transition-colors">매물 목록</Link>
            <Link href="/valuation" className="hover:text-white transition-colors">기업가치 계산기</Link>
            <Link href="/sell" className="hover:text-white transition-colors">매물 등록</Link>
          </div>
        </div>
        <div>
          <p className="text-white text-sm font-medium mb-3">안내</p>
          <div className="flex flex-col gap-2 text-sm">
            <span>이메일: contact@biztrade.kr</span>
            <span>운영시간: 평일 09:00 – 18:00</span>
            <span className="text-xs mt-2 leading-relaxed text-gray-500">
              본 플랫폼에 게시된 정보는 참고용이며,<br />
              실제 투자 결정 전 전문가 자문을 권장합니다.
            </span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800 text-center py-4 text-xs text-gray-600">
        © 2025 BizTrade. All rights reserved.
      </div>
    </footer>
  )
}
