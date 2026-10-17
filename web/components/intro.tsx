// 初回訪問時だけ、円相が一筆で描かれてから幕が上がる（CSS のみで完結し、JS なしでも自動で消える）
export function Intro() {
  return (
    <div className="intro" aria-hidden>
      <svg viewBox="0 0 120 120" className="intro-enso">
        <path d="M100 44A44 44 0 1 0 104 60" pathLength={1} />
      </svg>
      <span className="intro-word mono">Kasure — かすれ</span>
    </div>
  );
}

// 同じタブで 2 回目以降はイントロを出さない（描画前に判定してちらつきを防ぐ）
export const introScript = `try{if(sessionStorage.getItem('kasure:intro')){document.documentElement.dataset.intro='seen'}else{sessionStorage.setItem('kasure:intro','1')}}catch(e){}`;
