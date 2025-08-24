// components/Loader.jsx
// -----------------------------------------------------------------------------
// 재사용 가능한 로더(스피너) 컴포넌트
// - 어디서나 import 해서 <Loader /> 로 표시할 수 있습니다.
// - 접근성(ARIA) 처리가 되어 있어 스크린리더에서도 "로딩 중" 상태를 읽어줍니다.
//
// [props]
//   - text: 스피너 옆에 보여줄 안내 문구 (기본값: "불러오는 중...")
//   - size: 스피너(원)의 가로/세로 픽셀 크기. 숫자(px)만 넣으면 됩니다. (기본값: 20)
//
// [디자인 커스터마이징 팁]
//   - 색상: 아래 파란 원의 border 색을 바꾸세요 (tailwind: border-blue-600 부분)
//   - 두께: border-2 → border-[1|2|4] 로 바꾸면 선 굵기가 조정됩니다.
//   - 회전 속도: Tailwind의 animate-spin은 고정 속도입니다.
//       더 느리게/빠르게 하려면 'animate-[spin_1.5s_linear_infinite]' 같은 커스텀 클래스를 추가하세요.
//   - 다크모드: text / border 색상을 dark: 접두사로 별도 정의할 수 있습니다.
// -----------------------------------------------------------------------------

export default function Loader({ text = "불러오는 중...", size = 20 }) {
  // size 값 하나로 너비/높이를 동시에 지정합니다.
  // ※ 스타일 객체를 쓰는 이유: tailwind는 임의 숫자(px) 바인딩에 바로 대응하지 않기 때문.
  const box = { width: size, height: size };

  return (
    // role="status" + aria-live="polite":
    //   스크린리더가 이 영역을 "상태 변화"로 인식하고 문구를 읽어줍니다.
    //   (너무 자주 바뀌는 경우 과도한 읽기를 막기 위해 polite로 설정)
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      {/* 스피너 아이콘(겹쳐진 두 개의 동심원) */}
      <span className="relative inline-flex" style={box}>
        {/* 회전하지 않는 '트랙(회색 고리)' */}
        <span
          className="absolute inset-0 rounded-full border-2 border-gray-300"
          aria-hidden="true" // 장식용: 보조기기에 읽히지 않도록
        />

        {/* 회전하는 '프로그레스(파란 고리)' 
            - border-t-transparent: 위쪽만 투명 → 회전 시 빈틈이 생겨 '도는 느낌'이 납니다.
            - animate-spin: Tailwind 내장 회전 애니메이션 (고정 속도)
            - 색상/굵기 커스터마이징 포인트: border-blue-600 / border-2 */}
        <span
          className="absolute inset-0 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"
          aria-hidden="true"
        />
      </span>

      {/* 사용자가 보게 될 안내 문구 (예: "노드 그래픽 뷰 로딩중입니다. 잠시만 기다려주세요") */}
      <span className="text-sm font-medium text-gray-700">{text}</span>

      {/* 스크린리더 전용 문구(시각적으로는 숨김).
          - 위의 문구와 동일하게 넣어 중복 읽기를 방지하면서도 보조기기 호환성을 높입니다. */}
      <span className="sr-only">{text}</span>
    </div>
  );
}
