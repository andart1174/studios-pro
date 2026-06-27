// Chess / Sudoku → 3D Interactive Board
window.ChessBoard3D = (() => {
  'use strict';
  let _container, _panel;

  function buildUI() {
    const isEN = (window.currentLang || 'en') !== 'fr';
    _panel = document.createElement('div');
    _panel.id = 'chess3d-panel';
    _panel.style.cssText = 'display:none;position:absolute;inset:0;background:rgba(13,18,37,0.98);z-index:100;padding:15px;font-family:Inter,sans-serif;color:#f1f5f9;border-radius:8px;overflow-y:auto;';
    _panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;border-bottom:1px solid #1e293b;padding-bottom:10px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#f8fafc,#64748b);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧩</div>
        <div>
          <div style="font-size:14px;font-weight:700;">${isEN ? 'Chess / Sudoku → 3D Board' : 'Échecs / Sudoku → Plateau 3D'}</div>
          <div style="font-size:10px;color:#64748b;">${isEN ? 'Premium 3D game board' : 'Plateau de jeu 3D premium'}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <button id="chess3d-tab-chess" style="flex:1;padding:6px;background:rgba(248,250,252,0.2);border:1px solid #94a3b8;border-radius:6px;color:#fff;font-size:11px;font-weight:700;cursor:pointer;">♟ ${isEN ? 'Chess' : 'Échecs'}</button>
        <button id="chess3d-tab-sudoku" style="flex:1;padding:6px;background:rgba(59,130,246,0.15);border:1px solid #3b82f6;border-radius:6px;color:#93c5fd;font-size:11px;cursor:pointer;">🔢 Sudoku</button>
      </div>
      <div id="chess3d-chess-opts">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'FEN position (leave empty for start):' : 'Position FEN (vide = position initiale):'}</div>
        <input type="text" id="chess3d-fen" placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR" style="width:100%;padding:7px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#22c55e;font-size:10px;font-family:monospace;margin-bottom:8px;">
      </div>
      <div id="chess3d-sudoku-opts" style="display:none;">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">${isEN ? 'Sudoku grid (81 digits, 0=empty):' : 'Grille Sudoku (81 chiffres, 0=vide):'}</div>
        <input type="text" id="chess3d-sudoku" placeholder="530070000600195000098000060800060003400803001700020006060000280000419005000080079" style="width:100%;padding:7px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#60a5fa;font-size:10px;font-family:monospace;margin-bottom:8px;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Board Material' : 'Matériau Plateau'}</div>
          <select id="chess3d-mat" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="classic">${isEN ? 'Classic Wood' : 'Bois Classique'}</option>
            <option value="marble">${isEN ? 'Marble' : 'Marbre'}</option>
            <option value="crystal">${isEN ? 'Crystal' : 'Cristal'}</option>
            <option value="neon">Neon</option>
          </select>
        </div>
        <div>
          <div style="font-size:10px;color:#94a3b8;margin-bottom:3px;">${isEN ? 'Piece Style' : 'Style Pièces'}</div>
          <select id="chess3d-piece" style="width:100%;padding:5px;background:#1e293b;border:1px solid #333;border-radius:4px;color:#fff;font-size:10px;">
            <option value="modern">${isEN ? 'Modern' : 'Moderne'}</option>
            <option value="ancient">${isEN ? 'Ancient' : 'Antique'}</option>
            <option value="robot">${isEN ? 'Robot' : 'Robot'}</option>
          </select>
        </div>
      </div>
      <button id="chess3d-add" style="width:100%;padding:12px;background:linear-gradient(135deg,#f8fafc,#64748b);border:none;border-radius:10px;color:#0f172a;font-size:12px;font-weight:700;cursor:pointer;">
        ${isEN ? '♟ CREATE 3D BOARD' : '♟ CRÉER PLATEAU 3D'}
      </button>`;
    _container.appendChild(_panel);
    _bindUI();
  }

  function _bindUI() {
    const chessTab = _panel.querySelector('#chess3d-tab-chess');
    const sudokuTab = _panel.querySelector('#chess3d-tab-sudoku');
    const chessOpts = _panel.querySelector('#chess3d-chess-opts');
    const sudokuOpts = _panel.querySelector('#chess3d-sudoku-opts');
    let mode = 'chess';
    chessTab.onclick = () => { mode = 'chess'; chessOpts.style.display = 'block'; sudokuOpts.style.display = 'none'; };
    sudokuTab.onclick = () => { mode = 'sudoku'; chessOpts.style.display = 'none'; sudokuOpts.style.display = 'block'; };
    _panel.querySelector('#chess3d-add').onclick = () => {
      const fen = _panel.querySelector('#chess3d-fen').value || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
      const sudoku = _panel.querySelector('#chess3d-sudoku').value || '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
      const boardMat = _panel.querySelector('#chess3d-mat').value;
      const pieceStyle = _panel.querySelector('#chess3d-piece').value;
      if (window.SketchExtruder && window.SketchExtruder.addExtraModule) {
        window.SketchExtruder.addExtraModule('chess-board', { mode, fen, sudoku, boardMat, pieceStyle });
        _panel.style.display = 'none';
      }
    };
  }

  function init(container, btn) {
    _container = container; buildUI();
    if (btn) btn.addEventListener('click', () => {
      const visible = _panel.style.display === 'flex';
      document.querySelectorAll('[id$="-panel"]').forEach(p => p.style.display = 'none');
      _panel.style.display = visible ? 'none' : 'flex'; _panel.style.flexDirection = 'column';
    });
  }
  return { init };
})();
